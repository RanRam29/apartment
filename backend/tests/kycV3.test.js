process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';

const crypto = require('crypto');
const request = require('supertest');

// Mock UserPoints to prevent Mongoose connection timeouts
jest.mock('../src/models/mongo/UserPoints', () => {
  return {
    findOne: jest.fn(),
    deleteMany: jest.fn(),
  };
});

// Mock UserPreferences to prevent Mongoose timeouts during registration
jest.mock('../src/models/mongo/UserPreferences', () => {
  return {
    create: jest.fn(async () => ({})),
    findOne: jest.fn(async () => ({})),
    updateOne: jest.fn(async () => ({})),
  };
});

const { sequelize, initPostgres } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const { User, UserKycProfile, AgreementParty, RentalAgreement, Apartment } = require('../src/models');
const UserPoints = require('../src/models/mongo/UserPoints');

const { validateIsraeliId, verifyWebhookSignature } = require('../src/services/kycServiceV3');

describe('KYC Service & Webhooks Integration Suite (M6)', () => {
  let tenantToken = '';
  let tenant = null;
  let landlordToken = '';
  let landlord = null;
  let agreementId = '';
  const webhookSecret = 'test-webhook-secret';

  beforeAll(async () => {
    process.env.PERSONA_WEBHOOK_SECRET = webhookSecret;
    await initPostgres();
    await initRedis().catch(() => {});

    await sequelize.sync({ force: false });

    const password = 'Password123!';
    const unique = Date.now();

    // Register tenant
    const tRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `tenant-kyc-${unique}@test.com`,
        password,
        firstName: 'Tenant',
        lastName: 'User',
        role: 'tenant',
      });
    tenantToken = tRes.body.token;
    tenant = await User.findOne({ where: { email: `tenant-kyc-${unique}@test.com` } });
    await tenant.update({ isVerified: true });

    // Register landlord
    const llRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `landlord-kyc-${unique}@test.com`,
        password,
        firstName: 'Landlord',
        lastName: 'User',
        role: 'landlord',
      });
    landlordToken = llRes.body.token;
    landlord = await User.findOne({ where: { email: `landlord-kyc-${unique}@test.com` } });
    await landlord.update({ isVerified: true });

    // Seed mock apartment
    await Apartment.create({
      id: '00000000-0000-4000-8000-000000000777',
      landlordId: landlord.id,
      title: 'דירת בדיקה לקבוצת KYC',
      price: 5000,
      rooms: 3,
      city: 'תל אביב',
    });

    // Seed mock rental agreement and party
    const agreement = await RentalAgreement.create({
      landlordId: landlord.id,
      propertyId: '00000000-0000-4000-8000-000000000777',
      status: 'PENDING_SIGN',
      monthlyRentIls: 5000,
    });
    agreementId = agreement.id;

    await AgreementParty.create({
      agreementId,
      userId: tenant.id,
      role: 'tenant',
      kycStatus: 'PENDING',
    });
  });

  afterAll(async () => {
    await sequelize.close();
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.disconnect();
    }
  });

  beforeEach(async () => {
    await UserKycProfile.destroy({ where: {} }).catch(() => {});
    jest.clearAllMocks();
  });

  describe('Israeli ID Checksum Validation Utility', () => {
    it('validates a correct Israeli ID', () => {
      expect(validateIsraeliId('000000018')).toBe(true);
      expect(validateIsraeliId('123456780')).toBe(false);
    });
  });

  describe('HMAC Webhook Signature Verification Utility', () => {
    it('validates a correct HMAC-SHA256 signature', () => {
      const payload = JSON.stringify({ data: { id: 'inq_123' } });
      const signature = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
      const isValid = verifyWebhookSignature(payload, signature, webhookSecret);
      expect(isValid).toBe(true);
    });

    it('rejects an incorrect signature', () => {
      const payload = JSON.stringify({ data: { id: 'inq_123' } });
      const wrongSig = 'deadbeef';
      const isValid = verifyWebhookSignature(payload, wrongSig, webhookSecret);
      expect(isValid).toBe(false);
    });
  });

  describe('API Endpoints integration', () => {
    it('POST /api/v3/kyc/initiate - creates a pending KYC profile and generates an inquiry ID', async () => {
      const res = await request(app)
        .post('/api/v3/kyc/initiate')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('initiated');
      expect(res.body.inquiryId).toBeDefined();

      const kyc = await UserKycProfile.findOne({ where: { userId: tenant.id } });
      expect(kyc.status).toBe('PENDING');
      expect(kyc.personaInquiryId).toBe(res.body.inquiryId);
    });

    it('POST /api/v3/kyc/initiate - returns already_approved if user is already verified', async () => {
      await UserKycProfile.create({
        userId: tenant.id,
        status: 'APPROVED',
        personaInquiryId: 'inq_already_verified',
      });

      const res = await request(app)
        .post('/api/v3/kyc/initiate')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('already_approved');
    });

    it('POST /api/v3/kyc/validate-id - calls validate ID utility and returns result', async () => {
      const resOk = await request(app)
        .post('/api/v3/kyc/validate-id')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ idNumber: '000000018' });

      expect(resOk.status).toBe(200);
      expect(resOk.body.valid).toBe(true);

      const resErr = await request(app)
        .post('/api/v3/kyc/validate-id')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ idNumber: '123456780' });

      expect(resErr.status).toBe(200);
      expect(resErr.body.valid).toBe(false);
    });
  });

  describe('Persona Webhook Receiver E2E', () => {
    it('POST /api/v3/kyc/webhook - rejects requests with missing or invalid signature', async () => {
      const payload = { data: { id: 'inq_xyz', attributes: { status: 'completed' } } };
      
      const res = await request(app)
        .post('/api/v3/kyc/webhook')
        .send(payload);

      expect(res.status).toBe(401);
    });

    it('POST /api/v3/kyc/webhook - handles completed inquiry, unlocks agreements, and credits gamification points', async () => {
      const inquiryId = `inq_completed_${Date.now()}`;
      
      // Create pending profile
      await UserKycProfile.create({
        userId: tenant.id,
        status: 'PENDING',
        personaInquiryId: inquiryId,
      });

      // Stub UserPoints document for gamification Service
      const pointsDoc = {
        userId: String(tenant.id),
        points: 0,
        level: 1,
        badges: [],
        lastActivityAt: null,
        save: jest.fn(async function() {
          pointsDoc.points = this.points;
          pointsDoc.level = this.level;
          pointsDoc.badges = this.badges;
          return this;
        }),
      };
      UserPoints.findOne.mockResolvedValue(pointsDoc);

      const payload = {
        data: {
          id: inquiryId,
          attributes: {
            status: 'completed',
            inquiry_id: inquiryId,
          }
        }
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      const res = await request(app)
        .post('/api/v3/kyc/webhook')
        .set('persona-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.processed).toBe(true);
      expect(res.body.status).toBe('APPROVED');

      // Verify UserKycProfile is APPROVED
      const kyc = await UserKycProfile.findOne({ where: { personaInquiryId: inquiryId } });
      expect(kyc.status).toBe('APPROVED');

      // Verify AgreementParty is unlocked (kycStatus set to APPROVED)
      const party = await AgreementParty.findOne({ where: { userId: tenant.id, agreementId } });
      expect(party.kycStatus).toBe('APPROVED');

      // Verify Gamification points (25pts for identity_verified)
      expect(pointsDoc.points).toBe(25);
      expect(pointsDoc.level).toBe(1);
      expect(pointsDoc.badges[0].id).toBe('verified');
    });

    it('POST /api/v3/kyc/webhook - handles failed inquiry and updates status to REJECTED', async () => {
      const inquiryId = `inq_failed_${Date.now()}`;
      
      await UserKycProfile.create({
        userId: tenant.id,
        status: 'PENDING',
        personaInquiryId: inquiryId,
      });

      const payload = {
        data: {
          id: inquiryId,
          attributes: {
            status: 'failed',
            inquiry_id: inquiryId,
          }
        }
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      const res = await request(app)
        .post('/api/v3/kyc/webhook')
        .set('persona-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.processed).toBe(true);
      expect(res.body.status).toBe('REJECTED');

      const kyc = await UserKycProfile.findOne({ where: { personaInquiryId: inquiryId } });
      expect(kyc.status).toBe('REJECTED');
    });
  });
});
