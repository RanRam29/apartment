process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';
const request = require('supertest');
const app = require('../src/app');
const { User, RentalAgreement, AgreementRoom, UserKycProfile } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');

// Mock R2 Service
jest.mock('../src/services/r2Service', () => ({
  uploadFile: jest.fn().mockResolvedValue({ bucket: 'checkin-photos', key: 'mock-photo.jpg' }),
  BUCKETS: {
    CHECKIN_PHOTOS: 'checkin-photos',
  },
}));

describe('Check-In Flow (M3)', () => {
  let landlordToken = '';
  let landlord = null;
  let tenantToken = '';
  let tenant = null;
  let agreementId = '';
  let roomId1 = '';

  beforeAll(async () => {
    await sequelize.sync({ force: false });
    await initRedis().catch(() => {});

    const password = 'Password123!';

    // Register landlord
    const landlordEmail = `landlord-checkin-${Date.now()}@example.com`;
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
    const tenantEmail = `tenant-checkin-${Date.now()}@example.com`;
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

    // Seed mock active agreement
    const agreement = await RentalAgreement.create({
      landlordId: landlord.id,
      propertyId: '00000000-0000-4000-8000-000000000003',
      status: 'ACTIVE',
      monthlyRentIls: 5000,
      startDate: '2026-07-01',
      endDate: '2027-06-30',
      paymentDueDay: 1,
    });
    agreementId = agreement.id;

    // Seed builtin rooms
    const r1 = await AgreementRoom.create({ agreementId, name: 'סלון', type: 'builtin' });
    const r2 = await AgreementRoom.create({ agreementId, name: 'מטבח', type: 'builtin' });
    roomId1 = r1.id;
  });

  it('rejects photo uploads for a non-existent room', async () => {
    const res = await request(app)
      .post(`/api/v3/contracts/${agreementId}/checkin/00000000-0000-0000-0000-000000000000/photos`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .attach('photos', Buffer.from('fake img'), 'salon.jpg');

    expect(res.status).toBe(404);
  });

  it('rejects photo uploads when the contract status is not ACTIVE', async () => {
    // Modify contract to PENDING_SIGN temporarily
    const agreement = await RentalAgreement.findByPk(agreementId);
    await agreement.update({ status: 'PENDING_SIGN' });

    const res = await request(app)
      .post(`/api/v3/contracts/${agreementId}/checkin/${roomId1}/photos`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .attach('photos', Buffer.from('fake img'), 'salon.jpg');

    expect(res.status).toBe(422);

    // Reset status to ACTIVE
    await agreement.update({ status: 'ACTIVE' });
  });

  it('allows tenant to upload check-in inspection photos for a room', async () => {
    const res = await request(app)
      .post(`/api/v3/contracts/${agreementId}/checkin/${roomId1}/photos`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .attach('photos', Buffer.from('fake img'), 'salon.jpg')
      .attach('photos', Buffer.from('fake img 2'), 'salon_boiler.jpg');

    expect(res.status).toBe(200);
    expect(res.body.uploaded).toBe(2);

    const room = await AgreementRoom.findByPk(roomId1);
    expect(room.checkinPhotos).toHaveLength(2);
  });

  it('allows landlord to finalize and complete the check-in phase', async () => {
    const res = await request(app)
      .post(`/api/v3/contracts/${agreementId}/checkin/complete`)
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(200);
    expect(res.body.checkinCompleted).toBe(true);
    expect(res.body.completedAt).toBeDefined();

    const agreement = await RentalAgreement.findByPk(agreementId);
    expect(agreement.checkinCompletedAt).toBeDefined();
  });

  afterAll(async () => {
    await sequelize.close();
    getRedisClient().disconnect();
  });
});
