process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';
const request = require('supertest');
const app = require('../src/app');
const { User, RentalAgreement, AgreementParty, UserKycProfile, LedgerRow, Apartment, Match, Swipe } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');

// Mock R2 Service
jest.mock('../src/services/r2Service', () => ({
  uploadFile: jest.fn().mockResolvedValue({ bucket: 'contract-docs', key: 'mock-key.pdf' }),
  getPresignedUrl: jest.fn().mockResolvedValue('https://presigned.example.com/mock-key.pdf'),
  BUCKETS: {
    CONTRACT_DOCS: 'contract-docs',
    CHECKIN_PHOTOS: 'checkin-photos',
    PAYMENT_RECEIPTS: 'payment-receipts',
  },
}));

// Mock Gemini Service
jest.mock('../src/services/geminiService', () => ({
  extractContractFields: jest.fn().mockResolvedValue({
    landlordName: 'יוסי כהן',
    landlordId: '012345678',
    tenantName: 'דנה לוי',
    tenantId: '987654321',
    address: 'רחוב הרצל 5, תל אביב',
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    monthlyRent: 5000,
    paymentDay: 1,
    cpiLinked: false,
    missingFields: [],
    warnings: [],
  }),
}));

describe('Contract Upload & AI Extraction (M1/M2)', () => {
  let landlordToken = '';
  let landlord = null;
  let tenantToken = '';
  let tenant = null;
  let agreementId = '';

  beforeAll(async () => {
    // Sync schemas
    await sequelize.sync({ force: false });
    await initRedis().catch(() => {});

    const password = 'Password123!';

    // Register landlord
    const landlordEmail = `landlord-${Date.now()}@example.com`;
    const llRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: landlordEmail,
        password,
        firstName: 'Landlord',
        lastName: 'User',
        role: 'landlord',
      });
    landlordToken = llRes.body.token;
    landlord = await User.findOne({ where: { email: landlordEmail } });
    await landlord.update({ isVerified: true });

    // Register tenant
    const tenantEmail = `tenant-${Date.now()}@example.com`;
    const tRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: tenantEmail,
        password,
        firstName: 'Tenant',
        lastName: 'User',
        role: 'tenant',
      });
    tenantToken = tRes.body.token;
    tenant = await User.findOne({ where: { email: tenantEmail } });
    await tenant.update({ isVerified: true });

    // Pre-approve landlord KYC so validation passes later
    await UserKycProfile.create({
      userId: landlord.id,
      status: 'APPROVED',
      personaInquiryId: `inq_ll_${Date.now()}`,
    });

    // Clean up database tables to make the test idempotent and avoid unique constraints
    await Match.destroy({ where: {} }).catch(() => {});
    await Swipe.destroy({ where: {} }).catch(() => {});
    await AgreementParty.destroy({ where: {} }).catch(() => {});
    await RentalAgreement.destroy({ where: {} }).catch(() => {});
    await Apartment.destroy({ where: {} }).catch(() => {});

    await Apartment.create({
      id: '00000000-0000-4000-8000-000000000002',
      landlordId: landlord.id,
      title: 'דירת בדיקה',
      price: 5000,
      rooms: 3,
      city: 'תל אביב',
    });
  });

  it('allows landlord to upload a PDF contract and triggers Gemini OCR', async () => {
    const res = await request(app)
      .post('/api/v3/contracts/upload')
      .set('Authorization', `Bearer ${landlordToken}`)
      .attach('contract', Buffer.from('fake pdf content'), 'lease.pdf')
      .field('propertyId', '00000000-0000-4000-8000-000000000002');

    expect(res.status).toBe(201);
    expect(res.body.agreement).toBeDefined();
    expect(res.body.agreement.status).toBe('UPLOAD');
    expect(res.body.extracted.monthlyRent).toBe(5000);
    agreementId = res.body.agreement.id;
  });

  it('allows retrieving agreement details with presigned PDF URLs', async () => {
    const res = await request(app)
      .get(`/api/v3/contracts/${agreementId}`)
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(200);
    expect(res.body.documentUrl).toContain('presigned');
    expect(res.body.rooms).toHaveLength(4); // 4 builtin rooms seeded automatically
  });

  it('allows correcting extracted contract parameters in UPLOAD state', async () => {
    const res = await request(app)
      .patch(`/api/v3/contracts/${agreementId}/fields`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ monthlyRentIls: 5500 });

    expect(res.status).toBe(200);
    expect(parseFloat(res.body.monthlyRentIls)).toBe(5500);
  });

  it('allows inviting a tenant to be a party to the contract', async () => {
    const res = await request(app)
      .post(`/api/v3/contracts/${agreementId}/invite-tenant`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ tenantUserId: tenant.id });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('tenant');
    expect(res.body.agreementId).toBe(agreementId);
  });

  it('reports gate validation failures when tenant KYC is unapproved', async () => {
    const res = await request(app)
      .get(`/api/v3/contracts/${agreementId}/validate`)
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.errors.some(e => e.includes('KYC not approved'))).toBe(true);
  });

  it('transitions state successfully once KYC is approved', async () => {
    // Approve tenant KYC directly in DB
    await UserKycProfile.create({
      userId: tenant.id,
      status: 'APPROVED',
      personaInquiryId: `inq_t_${Date.now()}`,
    });

    // Check gate passes
    const gateRes = await request(app)
      .get(`/api/v3/contracts/${agreementId}/validate`)
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(gateRes.body.valid).toBe(true);

    // Transition UPLOAD → PENDING_SIGN
    const transRes = await request(app)
      .post(`/api/v3/contracts/${agreementId}/transition`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ targetStatus: 'PENDING_SIGN' });

    expect(transRes.status).toBe(200);
    expect(transRes.body.status).toBe('PENDING_SIGN');
  });

  it('gathers tenant and landlord digital signatures, then auto-activates lease and generates ledgers', async () => {
    // Landlord signs
    const llSign = await request(app)
      .post(`/api/v3/contracts/${agreementId}/sign`)
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(llSign.status).toBe(200);
    expect(llSign.body.allSigned).toBe(false);

    // Tenant signs
    const tSign = await request(app)
      .post(`/api/v3/contracts/${agreementId}/sign`)
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(tSign.status).toBe(200);
    expect(tSign.body.allSigned).toBe(true);
    expect(tSign.body.status).toBe('ACTIVE');

    // Confirm that monthly ledgers were automatically generated
    const ledgers = await LedgerRow.findAll({ where: { agreementId } });
    expect(ledgers.length).toBeGreaterThan(0);
  });

  it('records property ownership verification decisions made by tenants', async () => {
    const res = await request(app)
      .post(`/api/v3/contracts/${agreementId}/verify-ownership`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ choice: 'verified' });

    expect(res.status).toBe(201);
    expect(res.body.choice).toBe('verified');
  });

  afterAll(async () => {
    await sequelize.close();
    getRedisClient().disconnect();
  });
});
