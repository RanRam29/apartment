process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';

jest.mock('../src/config/redis', () => {
  const store = new Map();
  const mockClient = { disconnect: jest.fn() };
  return {
    initRedis: jest.fn().mockResolvedValue(undefined),
    getRedisClient: jest.fn(() => mockClient),
    cacheGet: jest.fn(async (key) => {
      const value = store.get(key);
      return value === undefined ? null : value;
    }),
    cacheSet: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    cacheDel: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});

const { sequelize, ensureUserVerificationColumns } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const { User, TrustScoreEvent } = require('../src/models');

beforeAll(async () => {
  await Promise.all([
    sequelize.sync({ force: false }),
    ensureUserVerificationColumns(),
    initRedis(),
  ]);
});

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('Trust Score Step 1 - Models and Schema', () => {
  it('User model should have onboardingState property default to {}', async () => {
    const user = User.build({
      email: 'test_onboarding@test.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'dummy',
    });
    expect(user.onboardingState).toEqual({});
  });

  it('TrustScoreEvent model should exist and have correct fields and associations', async () => {
    expect(TrustScoreEvent).toBeDefined();
    const event = TrustScoreEvent.build({
      userId: '4586f835-ab24-4539-865f-0e526f2d3ba4',
      eventKey: 'kyc_approved',
      delta: 20,
      meta: { foo: 'bar' },
      dedupeKey: 'kyc_approved:4586f835-ab24-4539-865f-0e526f2d3ba4',
    });

    expect(event.userId).toBe('4586f835-ab24-4539-865f-0e526f2d3ba4');
    expect(event.eventKey).toBe('kyc_approved');
    expect(event.delta).toBe(20);
    expect(event.meta).toEqual({ foo: 'bar' });
    expect(event.dedupeKey).toBe('kyc_approved:4586f835-ab24-4539-865f-0e526f2d3ba4');

    // Test associations
    expect(User.associations.trustScoreEvents).toBeDefined();
    expect(TrustScoreEvent.associations.user).toBeDefined();
  });
});

describe('Trust Score Step 2 - Service Logic', () => {
  const { applyTrustEvent, revokeTrustEvent, getTrustStatus } = require('../src/services/trustScoreService');
  let testUser;

  beforeEach(async () => {
    // Clean database before each test
    await TrustScoreEvent.destroy({ where: {} });

    testUser = await User.create({
      email: `trust_test_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`,
      firstName: 'Trust',
      lastName: 'Tester',
      passwordHash: 'dummy_hash',
      trustScore: 50,
      activeRole: 'tenant',
    });
  });

  it('should apply a trust event and update the user score', async () => {
    const event = await applyTrustEvent(testUser.id, 'kyc_approved');
    expect(event).toBeDefined();
    expect(event.delta).toBe(20);

    const updatedUser = await User.findByPk(testUser.id);
    expect(updatedUser.trustScore).toBe(70);
  });

  it('should automatically deduplicate "once" events and return null', async () => {
    const firstEvent = await applyTrustEvent(testUser.id, 'kyc_approved');
    expect(firstEvent).toBeDefined();

    const secondEvent = await applyTrustEvent(testUser.id, 'kyc_approved');
    expect(secondEvent).toBeNull();

    const updatedUser = await User.findByPk(testUser.id);
    expect(updatedUser.trustScore).toBe(70); // remains 70
  });

  it('should respect the accumulative cap for capped events', async () => {
    // rent_paid_on_time has delta +5, cap 30
    for (let i = 0; i < 6; i++) {
      const event = await applyTrustEvent(testUser.id, 'rent_paid_on_time');
      expect(event.delta).toBe(5);
    }

    // 7th time should be capped to delta 0
    const extraEvent = await applyTrustEvent(testUser.id, 'rent_paid_on_time');
    expect(extraEvent.delta).toBe(0);

    const updatedUser = await User.findByPk(testUser.id);
    expect(updatedUser.trustScore).toBe(80); // 50 + 30
  });

  it('should clamp the score to [0, 100] and record actual delta in the event', async () => {
    // Set score close to 100
    await testUser.update({ trustScore: 95 });

    // kyc_approved is +20
    const event = await applyTrustEvent(testUser.id, 'kyc_approved');
    expect(event.delta).toBe(5); // 100 - 95

    const updatedUser = await User.findByPk(testUser.id);
    expect(updatedUser.trustScore).toBe(100);
  });

  it('should revoke a rolling event by applying negative delta of active sum', async () => {
    // Apply fast_lead_response (+15)
    await applyTrustEvent(testUser.id, 'fast_lead_response');
    let updatedUser = await User.findByPk(testUser.id);
    expect(updatedUser.trustScore).toBe(65);

    // Revoke
    const revokeEvent = await revokeTrustEvent(testUser.id, 'fast_lead_response');
    expect(revokeEvent.delta).toBe(-15);

    updatedUser = await User.findByPk(testUser.id);
    expect(updatedUser.trustScore).toBe(50);

    // Revoking again when active sum is 0 should return null
    const secondRevoke = await revokeTrustEvent(testUser.id, 'fast_lead_response');
    expect(secondRevoke).toBeNull();
  });

  it('should return trust status with history and activeTasks filtered by role', async () => {
    await applyTrustEvent(testUser.id, 'kyc_approved');

    // Tenant role status
    const tenantStatus = await getTrustStatus(testUser.id, 'tenant');
    expect(tenantStatus.score).toBe(70);
    expect(tenantStatus.history.length).toBe(1);
    expect(tenantStatus.history[0].eventKey).toBe('kyc_approved');

    // kyc_approved should be COMPLETED (points = 0)
    const kycTask = tenantStatus.activeTasks.find(t => t.eventKey === 'kyc_approved');
    expect(kycTask.points).toBe(0);
    expect(kycTask.status).toBe('COMPLETED');

    // income_verified should be PENDING (points = 15)
    const incomeTask = tenantStatus.activeTasks.find(t => t.eventKey === 'income_verified');
    expect(incomeTask.points).toBe(15);
    expect(incomeTask.status).toBe('PENDING');

    // rent_paid_on_time should be PENDING (points = 30)
    const rentTask = tenantStatus.activeTasks.find(t => t.eventKey === 'rent_paid_on_time');
    expect(rentTask.points).toBe(30);
    expect(rentTask.status).toBe('PENDING');

    // Landlord tasks should not be in tenant activeTasks
    const ownershipTask = tenantStatus.activeTasks.find(t => t.eventKey === 'ownership_verified');
    expect(ownershipTask).toBeUndefined();

    // Landlord role status
    const landlordStatus = await getTrustStatus(testUser.id, 'landlord');
    const landlordOwnershipTask = landlordStatus.activeTasks.find(t => t.eventKey === 'ownership_verified');
    expect(landlordOwnershipTask).toBeDefined();
    expect(landlordOwnershipTask.points).toBe(25);
  });

  it('should prove that awarding gamification points does NOT modify trustScore', async () => {
    // Mock UserPoints MongoDB models for the test
    const UserPoints = require('../src/models/mongo/UserPoints');
    jest.spyOn(UserPoints, 'findOne').mockResolvedValue(null);
    jest.spyOn(UserPoints.prototype, 'save').mockResolvedValue(true);

    const { awardPoints } = require('../src/services/gamificationService');

    // Make sure starting trustScore is 50
    let updatedUser = await User.findByPk(testUser.id);
    expect(updatedUser.trustScore).toBe(50);

    // Award contract_signed points (+50 gamification points)
    await awardPoints(testUser.id, 'contract_signed');

    // Wait for the async database update to run
    await new Promise(resolve => setTimeout(resolve, 100));

    // Retrieve user and check trustScore remains 50
    updatedUser = await User.findByPk(testUser.id);
    expect(updatedUser.trustScore).toBe(50);
  });
});

describe('Trust Score Step 4 - Routes and Endpoints', () => {
  const request = require('supertest');
  const app = require('../src/app');
  const { generateStrongTestPassword } = require('./helpers/testCredentials');

  let tenantToken, landlordToken, tenantUser, landlordUser;

  beforeAll(async () => {
    // Register test tenant (use landlord role to bypass MongoDB insert on register, then update in PG)
    const password = generateStrongTestPassword();
    const tenantEmail = `tenant_route_${Date.now()}@test.com`;
    const resTenant = await request(app)
      .post('/api/auth/register')
      .send({
        email: tenantEmail,
        password,
        firstName: 'Tenant',
        lastName: 'Route',
        role: 'landlord',
      });
    tenantToken = resTenant.body.token;
    tenantUser = await User.findOne({ where: { email: tenantEmail } });
    await tenantUser.update({ role: 'tenant', activeRole: 'tenant', isVerified: true });

    // Register test landlord
    const landlordEmail = `landlord_route_${Date.now()}@test.com`;
    const resLandlord = await request(app)
      .post('/api/auth/register')
      .send({
        email: landlordEmail,
        password,
        firstName: 'Landlord',
        lastName: 'Route',
        role: 'landlord',
      });
    landlordToken = resLandlord.body.token;
    // Set activeRole explicitly to landlord
    landlordUser = await User.findOne({ where: { email: landlordEmail } });
    await landlordUser.update({ activeRole: 'landlord', isVerified: true });
  });

  it('GET /api/v3/trust/me should return trust status', async () => {
    const res = await request(app)
      .get('/api/v3/trust/me')
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(50);
    expect(res.body.history).toBeDefined();
    expect(res.body.activeTasks).toBeDefined();
    // Verify it contains tenant active tasks
    const hasKyc = res.body.activeTasks.some(t => t.eventKey === 'kyc_approved');
    expect(hasKyc).toBe(true);
  });

  it('GET /api/v3/trust/simulate should return hypothetical score', async () => {
    const res = await request(app)
      .get('/api/v3/trust/simulate?event=kyc_approved')
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.currentScore).toBe(50);
    expect(res.body.hypotheticalScore).toBe(70);
    expect(res.body.delta).toBe(20);
  });

  it('GET /api/v3/onboarding/checklist for tenant', async () => {
    const res = await request(app)
      .get('/api/v3/onboarding/checklist')
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('tenant');
    expect(res.body.checklist.length).toBe(3); // kyc, preferences, whatsapp
    expect(res.body.completionPct).toBe(0);
  });

  it('POST /api/v3/onboarding/step/:key/dismiss and checklist update', async () => {
    // Dismiss preferences
    const resDismiss = await request(app)
      .post('/api/v3/onboarding/step/preferences/dismiss')
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(resDismiss.status).toBe(200);
    expect(resDismiss.body.ok).toBe(true);

    // Get checklist again
    const resChecklist = await request(app)
      .get('/api/v3/onboarding/checklist')
      .set('Authorization', `Bearer ${tenantToken}`);

    const preferencesStep = resChecklist.body.checklist.find(t => t.key === 'preferences');
    expect(preferencesStep.dismissed).toBe(true);
  });

  it('GET /api/v3/onboarding/checklist for landlord', async () => {
    const res = await request(app)
      .get('/api/v3/onboarding/checklist')
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('landlord');
    expect(res.body.checklist.length).toBe(3); // first_property, contract_uploaded, whatsapp
  });
});

describe('Trust Score Step 5 - Event Hooks Integration', () => {
  const request = require('supertest');
  const app = require('../src/app');
  const { generateStrongTestPassword } = require('./helpers/testCredentials');

  let tenantToken, tenantUser, landlordUser, agreement;

  beforeAll(async () => {
    // Register tenant
    const password = generateStrongTestPassword();
    const tenantEmail = `tenant_hook_${Date.now()}@test.com`;
    const resTenant = await request(app)
      .post('/api/auth/register')
      .send({
        email: tenantEmail,
        password,
        firstName: 'Tenant',
        lastName: 'Hook',
        role: 'landlord', // registration bypass
      });
    tenantToken = resTenant.body.token;
    tenantUser = await User.findOne({ where: { email: tenantEmail } });
    await tenantUser.update({ role: 'tenant', activeRole: 'tenant', isVerified: true });

    // Register landlord
    const landlordEmail = `landlord_hook_${Date.now()}@test.com`;
    await request(app)
      .post('/api/auth/register')
      .send({
        email: landlordEmail,
        password,
        firstName: 'Landlord',
        lastName: 'Hook',
        role: 'landlord',
      });
    landlordUser = await User.findOne({ where: { email: landlordEmail } });
    await landlordUser.update({ activeRole: 'landlord', isVerified: true });

    // Create a property
    const { Apartment } = require('../src/models');
    const property = await Apartment.create({
      landlordId: landlordUser.id,
      title: 'Hook test property',
      city: 'Tel Aviv',
      address: 'Hook St 1',
      price: 5000,
      rooms: 2,
    });

    // Create agreement
    const { RentalAgreement } = require('../src/models');
    agreement = await RentalAgreement.create({
      landlordId: landlordUser.id,
      tenantId: tenantUser.id,
      propertyId: property.id,
      status: 'READY_SIGN',
      startDate: '2026-07-01',
      endDate: '2027-07-01',
      monthlyRentIls: 5000,
    });

    // Create approved KYC profiles for both so the transition is allowed
    const { UserKycProfile } = require('../src/models');
    await UserKycProfile.create({
      userId: tenantUser.id,
      status: 'APPROVED',
      personaInquiryId: `inq_tenant_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    });
    await UserKycProfile.create({
      userId: landlordUser.id,
      status: 'APPROVED',
      personaInquiryId: `inq_landlord_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    });
  });

  beforeEach(async () => {
    await TrustScoreEvent.destroy({ where: {} });
    tenantUser = await User.findByPk(tenantUser.id);
    landlordUser = await User.findByPk(landlordUser.id);
    await tenantUser.update({ trustScore: 50 });
    await landlordUser.update({ trustScore: 50 });
  });

  it('KYC APPROVED webhook should award kyc_approved event (+20)', async () => {
    const { handleWebhook } = require('../src/services/kycServiceV3');
    const { UserKycProfile } = require('../src/models');

    // Clean existing KYC profile for tenant so we can recreate it as PENDING
    await UserKycProfile.destroy({ where: { userId: tenantUser.id } });

    const kyc = await UserKycProfile.create({
      userId: tenantUser.id,
      status: 'PENDING',
      personaInquiryId: `test_persona_inquiry_id_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    });

    // Mock webhook payload
    const payload = JSON.stringify({
      data: {
        id: kyc.personaInquiryId,
        attributes: { status: 'completed' },
      },
    });
    // Calculate valid hmac signature
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', 'test-webhook-secret')
      .update(payload)
      .digest('hex');

    await handleWebhook(payload, signature);

    const updatedUser = await User.findByPk(tenantUser.id);
    expect(updatedUser.trustScore).toBe(70); // 50 + 20
  });

  it('Agreement transition to SIGNED should award digital_signing to both (+15)', async () => {
    // Mock AppConfig index
    const { AppConfig } = require('../src/models');
    await AppConfig.upsert({ key: 'cpi_index_current', value: '100.0' });

    // Transition agreement
    const res = await request(app)
      .post(`/api/v1/agreements/${agreement.id}/transition`)
      .set('Authorization', `Bearer ${tenantToken}`) // We can use tenantToken, authGuard accepts either party
      .send({ targetStatus: 'SIGNED' });

    expect(res.status).toBe(200);

    const updatedTenant = await User.findByPk(tenantUser.id);
    const updatedLandlord = await User.findByPk(landlordUser.id);

    expect(updatedTenant.trustScore).toBe(65); // 50 + 15
    expect(updatedLandlord.trustScore).toBe(65); // 50 + 15
  });

  it('Updating whatsappOptIn via PUT /api/users/me should award whatsapp_opt_in (+5)', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ whatsappOptIn: true });

    expect(res.status).toBe(200);

    const updatedUser = await User.findByPk(tenantUser.id);
    expect(updatedUser.trustScore).toBe(55); // 50 + 5
  });
});

