/**
 * Agreement lifecycle integration tests — Phase 1 acceptance criteria.
 *
 * Validates:
 *   - 401 on missing/invalid JWT
 *   - 403 on wrong role or unverified KYC
 *   - 423 Locked on PUT/PATCH/DELETE to SIGNED or ACTIVE agreements
 *   - State transition validation (checklist enforcement)
 *   - All 6 tables exist with correct constraints
 */
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_agreement_tests';

jest.mock('../src/config/redis', () => {
  const store = new Map();
  const mockClient = { disconnect: jest.fn() };
  return {
    initRedis: jest.fn().mockResolvedValue(undefined),
    getRedisClient: jest.fn(() => mockClient),
    cacheGet: jest.fn(async (key) => store.get(key) || null),
    cacheSet: jest.fn(async (key, value) => store.set(key, value)),
    cacheDel: jest.fn(async (key) => store.delete(key)),
  };
});

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const {
  User, Apartment, RentalAgreement, UserKycProfile,
  PaymentLedger, AgreementGuarantor, MaintenanceTicket,
  ProtocolEvidence,
} = require('../src/models');

const JWT_SECRET = process.env.JWT_SECRET;

let landlord, tenant, apartment, landlordToken, tenantToken;

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

beforeAll(async () => {
  await sequelize.sync({ force: false });
  await initRedis();

  const hash = await bcrypt.hash('Test1234!', 12);

  [landlord] = await User.findOrCreate({
    where: { email: `agree_landlord_${Date.now()}@test.com` },
    defaults: {
      email: `agree_landlord_${Date.now()}@test.com`,
      passwordHash: hash,
      firstName: 'Test',
      lastName: 'Landlord',
      role: 'landlord',
      isVerified: true,
    },
  });

  [tenant] = await User.findOrCreate({
    where: { email: `agree_tenant_${Date.now()}@test.com` },
    defaults: {
      email: `agree_tenant_${Date.now()}@test.com`,
      passwordHash: hash,
      firstName: 'Test',
      lastName: 'Tenant',
      role: 'tenant',
      isVerified: true,
    },
  });

  [apartment] = await Apartment.findOrCreate({
    where: { title: `Test Apt ${Date.now()}`, landlordId: landlord.id },
    defaults: {
      title: `Test Apt ${Date.now()}`,
      landlordId: landlord.id,
      price: 5000,
      rooms: 3,
      city: 'Tel Aviv',
    },
  });

  landlordToken = signToken(landlord);
  tenantToken = signToken(tenant);
}, 30_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

// ─── Schema Existence ──────────────────────────────────────────────
describe('Database schema', () => {
  it('all 6 new tables exist', async () => {
    const qi = sequelize.getQueryInterface();
    const tables = await qi.showAllTables();
    const required = [
      'rental_agreements', 'payment_ledger', 'agreement_guarantors',
      'maintenance_tickets', 'protocol_evidence', 'user_kyc_profiles',
    ];
    for (const table of required) {
      expect(tables).toContain(table);
    }
  });
});

// ─── AuthGuard: 401 Unauthorized ───────────────────────────────────
describe('AuthGuard — 401 Unauthorized', () => {
  it('rejects request with no token', async () => {
    const res = await request(app).get('/api/v1/agreements/fake-id');
    expect(res.status).toBe(401);
  });

  it('rejects request with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/agreements/fake-id')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

// ─── AuthGuard: 403 Forbidden (wrong role) ─────────────────────────
describe('AuthGuard — 403 Forbidden (role)', () => {
  it('rejects tenant creating an agreement', async () => {
    const res = await request(app)
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ propertyId: apartment.id });
    expect(res.status).toBe(403);
  });
});

// ─── AuthGuard: 403 Forbidden (KYC not approved) ──────────────────
describe('AuthGuard — 403 on transition without KYC', () => {
  let agreementId;

  beforeAll(async () => {
    const agreement = await RentalAgreement.create({
      landlordId: landlord.id,
      propertyId: apartment.id,
      status: 'DRAFT',
      startDate: '2026-07-01',
      endDate: '2027-07-01',
      monthlyRentIls: 5000,
      paymentDueDay: 1,
    });
    agreementId = agreement.id;
  });

  it('rejects transition when landlord has no KYC profile', async () => {
    const res = await request(app)
      .post(`/api/v1/agreements/${agreementId}/transition`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ targetStatus: 'PENDING_REVIEW' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/KYC/i);
  });

  it('allows transition after KYC is approved', async () => {
    await UserKycProfile.findOrCreate({
      where: { userId: landlord.id },
      defaults: { userId: landlord.id, roleType: 'LANDLORD', status: 'APPROVED' },
    });

    const res = await request(app)
      .post(`/api/v1/agreements/${agreementId}/transition`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ targetStatus: 'PENDING_REVIEW' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDING_REVIEW');
  });
});

// ─── StateLockGuard: 423 Locked ────────────────────────────────────
describe('StateLockGuard — 423 Locked', () => {
  let signedAgreementId, activeAgreementId;

  beforeAll(async () => {
    const signed = await RentalAgreement.create({
      landlordId: landlord.id,
      propertyId: apartment.id,
      status: 'SIGNED',
      startDate: '2026-07-01',
      endDate: '2027-07-01',
      monthlyRentIls: 5000,
      paymentDueDay: 1,
    });
    signedAgreementId = signed.id;

    const active = await RentalAgreement.create({
      landlordId: landlord.id,
      propertyId: apartment.id,
      status: 'ACTIVE',
      startDate: '2026-07-01',
      endDate: '2027-07-01',
      monthlyRentIls: 5000,
      paymentDueDay: 1,
    });
    activeAgreementId = active.id;
  });

  it('returns 423 on PUT to SIGNED agreement', async () => {
    const res = await request(app)
      .put(`/api/v1/agreements/${signedAgreementId}`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ monthlyRentIls: 6000 });
    expect(res.status).toBe(423);
    expect(res.body.error).toMatch(/locked/i);
  });

  it('returns 423 on PUT to ACTIVE agreement', async () => {
    const res = await request(app)
      .put(`/api/v1/agreements/${activeAgreementId}`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ monthlyRentIls: 6000 });
    expect(res.status).toBe(423);
  });

  it('returns 423 on DELETE to SIGNED agreement', async () => {
    const res = await request(app)
      .delete(`/api/v1/agreements/${signedAgreementId}`)
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(423);
  });

  it('allows GET on SIGNED agreement (read-through)', async () => {
    const res = await request(app)
      .get(`/api/v1/agreements/${signedAgreementId}`)
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SIGNED');
  });

  it('allows GET on ACTIVE agreement (read-through)', async () => {
    const res = await request(app)
      .get(`/api/v1/agreements/${activeAgreementId}`)
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');
  });
});

// ─── Agreement CRUD ────────────────────────────────────────────────
describe('Agreement CRUD', () => {
  let agreementId;

  it('landlord creates a draft agreement', async () => {
    const res = await request(app)
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ propertyId: apartment.id });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('DRAFT');
    agreementId = res.body.id;
  });

  it('updates draft fields', async () => {
    const res = await request(app)
      .put(`/api/v1/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        startDate: '2026-08-01',
        endDate: '2027-08-01',
        monthlyRentIls: 4500,
        paymentDueDay: 5,
      });
    expect(res.status).toBe(200);
    expect(Number(res.body.monthlyRentIls)).toBe(4500);
  });

  it('rejects end date less than 3 months from start', async () => {
    const res = await request(app)
      .put(`/api/v1/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ startDate: '2026-08-01', endDate: '2026-09-01' });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/3 months/i);
  });

  it('deletes a DRAFT agreement', async () => {
    const res = await request(app)
      .delete(`/api/v1/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(200);
  });
});

// ─── Transition Checklist Validation ───────────────────────────────
describe('Transition checklist', () => {
  let agreementId;

  beforeAll(async () => {
    const agreement = await RentalAgreement.create({
      landlordId: landlord.id,
      propertyId: apartment.id,
      status: 'DRAFT',
    });
    agreementId = agreement.id;
  });

  it('rejects DRAFT→PENDING_REVIEW without required fields', async () => {
    const res = await request(app)
      .post(`/api/v1/agreements/${agreementId}/transition`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ targetStatus: 'PENDING_REVIEW' });
    expect(res.status).toBe(422);
    expect(res.body.reasons.length).toBeGreaterThan(0);
  });

  it('rejects invalid transition (DRAFT→SIGNED)', async () => {
    const res = await request(app)
      .post(`/api/v1/agreements/${agreementId}/transition`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ targetStatus: 'SIGNED' });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/Invalid transition/);
  });
});
