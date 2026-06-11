process.env.JWT_SECRET = 'test_jwt_secret_for_idor_tests';
const request = require('supertest');
const app = require('../src/app');
const { User, Apartment, RentalAgreement, AgreementParty } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis } = require('../src/config/redis');

// Mock R2 so presigned URLs don't require credentials
jest.mock('../src/services/r2Service', () => ({
  uploadFile: jest.fn().mockResolvedValue({ bucket: 'contract-docs', key: 'mock-key.pdf' }),
  getPresignedUrl: jest.fn().mockResolvedValue('https://presigned.example.com/mock-key.pdf'),
  BUCKETS: {
    CONTRACT_DOCS: 'contract-docs',
    CHECKIN_PHOTOS: 'checkin-photos',
    PAYMENT_RECEIPTS: 'payment-receipts',
  },
}));

async function registerUser(role, label) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const res = await request(app).post('/api/auth/register').send({
    email,
    password: 'Password123!',
    firstName: label,
    lastName: 'User',
    role,
  });
  const user = await User.findOne({ where: { email } });
  await user.update({ isVerified: true, tosAcceptedAt: new Date() });
  return { token: res.body.token, user };
}

describe('Contracts V3 — IDOR protection', () => {
  let landlord, tenant, strangerTenant, strangerLandlord, agreement;

  beforeAll(async () => {
    await sequelize.sync({ force: false });
    await initRedis().catch(() => {});

    landlord = await registerUser('landlord', 'owner');
    tenant = await registerUser('tenant', 'party');
    strangerTenant = await registerUser('tenant', 'stranger-t');
    strangerLandlord = await registerUser('landlord', 'stranger-l');

    const apartment = await Apartment.create({
      landlordId: landlord.user.id,
      title: 'IDOR Test Apartment',
      price: 5000,
      rooms: 3,
      city: 'תל אביב',
    });

    agreement = await RentalAgreement.create({
      propertyId: apartment.id,
      landlordId: landlord.user.id,
      startDate: '2026-07-01',
      endDate: '2027-06-30',
      monthlyRentIls: 5000,
      paymentDueDay: 1,
      status: 'UPLOAD',
    });
    await AgreementParty.create({
      agreementId: agreement.id,
      userId: tenant.user.id,
      role: 'tenant',
    });
  });

  afterAll(async () => {
    await sequelize.close().catch(() => {});
  });

  describe('GET /api/v3/contracts/:id', () => {
    it('returns the agreement to its landlord', async () => {
      const res = await request(app)
        .get(`/api/v3/contracts/${agreement.id}`)
        .set('Authorization', `Bearer ${landlord.token}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(agreement.id);
    });

    it('returns the agreement to a tenant party', async () => {
      const res = await request(app)
        .get(`/api/v3/contracts/${agreement.id}`)
        .set('Authorization', `Bearer ${tenant.token}`);
      expect(res.status).toBe(200);
    });

    it('returns 404 (not 200, not 403) to an unrelated tenant', async () => {
      const res = await request(app)
        .get(`/api/v3/contracts/${agreement.id}`)
        .set('Authorization', `Bearer ${strangerTenant.token}`);
      expect(res.status).toBe(404);
    });

    it('returns 404 to an unrelated landlord', async () => {
      const res = await request(app)
        .get(`/api/v3/contracts/${agreement.id}`)
        .set('Authorization', `Bearer ${strangerLandlord.token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('write routes', () => {
    it('blocks an unrelated landlord from PATCH /:id/fields', async () => {
      const res = await request(app)
        .patch(`/api/v3/contracts/${agreement.id}/fields`)
        .set('Authorization', `Bearer ${strangerLandlord.token}`)
        .send({ monthlyRentIls: 9999 });
      expect(res.status).toBe(404);
      await agreement.reload();
      expect(Number(agreement.monthlyRentIls)).toBe(5000);
    });

    it('blocks an unrelated landlord from POST /:id/invite-tenant', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/invite-tenant`)
        .set('Authorization', `Bearer ${strangerLandlord.token}`)
        .send({ tenantUserId: strangerLandlord.user.id });
      expect(res.status).toBe(404);
    });

    it('blocks a tenant party from POST /:id/transition (landlord-only)', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/transition`)
        .set('Authorization', `Bearer ${tenant.token}`)
        .send({ targetStatus: 'PENDING_SIGN' });
      expect(res.status).toBe(403);
    });

    it('blocks a stranger from POST /:id/transition', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/transition`)
        .set('Authorization', `Bearer ${strangerTenant.token}`)
        .send({ targetStatus: 'PENDING_SIGN' });
      expect(res.status).toBe(404);
    });

    it('blocks a stranger from GET /:id/validate', async () => {
      const res = await request(app)
        .get(`/api/v3/contracts/${agreement.id}/validate`)
        .set('Authorization', `Bearer ${strangerTenant.token}`);
      expect(res.status).toBe(404);
    });

    it('blocks a stranger from POST /:id/sign', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/sign`)
        .set('Authorization', `Bearer ${strangerTenant.token}`);
      expect(res.status).toBe(404);
    });

    it('blocks a non-party from POST /:id/verify-ownership', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/verify-ownership`)
        .set('Authorization', `Bearer ${strangerTenant.token}`)
        .send({ choice: 'verified' });
      expect(res.status).toBe(404);
    });

    it('blocks the landlord from verify-ownership (tenant parties only)', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/verify-ownership`)
        .set('Authorization', `Bearer ${landlord.token}`)
        .send({ choice: 'verified' });
      expect(res.status).toBe(403);
    });

    it('allows the tenant party to verify-ownership', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/verify-ownership`)
        .set('Authorization', `Bearer ${tenant.token}`)
        .send({ choice: 'skipped' });
      expect(res.status).toBe(201);
    });
  });

  describe('checkin/checkout/renew routes', () => {
    it('blocks a stranger from uploading checkin photos', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/checkin/00000000-0000-4000-8000-00000000aaaa/photos`)
        .set('Authorization', `Bearer ${strangerTenant.token}`);
      expect(res.status).toBe(404);
    });

    it('blocks an unrelated landlord from completing checkin', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/checkin/complete`)
        .set('Authorization', `Bearer ${strangerLandlord.token}`);
      expect(res.status).toBe(404);
    });

    it('blocks a stranger from completing checkout', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/checkout/complete`)
        .set('Authorization', `Bearer ${strangerTenant.token}`);
      expect(res.status).toBe(404);
    });

    it('blocks an unrelated landlord from renewing the contract', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/renew`)
        .set('Authorization', `Bearer ${strangerLandlord.token}`);
      expect(res.status).toBe(404);
    });

    it('blocks a stranger from proposing an amendment', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/amend/propose`)
        .set('Authorization', `Bearer ${strangerTenant.token}`)
        .send({ field: 'monthlyRentIls', newValue: '1', reason: 'attack' });
      expect(res.status).toBe(404);
    });
  });
});
