process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';
const request = require('supertest');
const app = require('../src/app');
const { User, RentalAgreement, AgreementRoom } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');

// Mock R2 Service
jest.mock('../src/services/r2Service', () => ({
  uploadFile: jest.fn().mockResolvedValue({ bucket: 'checkin-photos', key: 'mock-photo.jpg' }),
  BUCKETS: {
    CHECKIN_PHOTOS: 'checkin-photos',
  },
}));

describe('Check-Out Flow (M4)', () => {
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
    const landlordEmail = `landlord-checkout-${Date.now()}@example.com`;
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
    const tenantEmail = `tenant-checkout-${Date.now()}@example.com`;
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
      propertyId: '00000000-0000-4000-8000-000000000004',
      status: 'ACTIVE',
      monthlyRentIls: 5000,
      startDate: '2026-07-01',
      endDate: '2027-06-30',
      paymentDueDay: 1,
    });
    agreementId = agreement.id;

    // Seed builtin rooms
    const r1 = await AgreementRoom.create({ agreementId, name: 'סלון', type: 'builtin' });
    roomId1 = r1.id;
  });

  it('allows tenant to upload checkout photos for a room', async () => {
    const res = await request(app)
      .post(`/api/v3/contracts/${agreementId}/checkout/${roomId1}/photos`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .attach('photos', Buffer.from('fake img'), 'checkout_salon.jpg');

    expect(res.status).toBe(200);
    expect(res.body.uploaded).toBe(1);

    const room = await AgreementRoom.findByPk(roomId1);
    expect(room.checkoutPhotos).toHaveLength(1);
  });

  it('allows landlord to request revisions with notes on checkout photos', async () => {
    const res = await request(app)
      .post(`/api/v3/contracts/${agreementId}/checkout/review`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        roomId: roomId1,
        notes: 'סלון לא נקי, נא לנקות',
        approved: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('revision_requested');
    expect(res.body.notes).toBe('סלון לא נקי, נא לנקות');

    const room = await AgreementRoom.findByPk(roomId1);
    expect(room.checkoutNotes).toBe('סלון לא נקי, נא לנקות');
    expect(room.checkoutPhotos).toHaveLength(0); // Cleared for revision upload
  });

  it('allows landlord to approve checkout once satisfactory', async () => {
    const res = await request(app)
      .post(`/api/v3/contracts/${agreementId}/checkout/review`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        roomId: roomId1,
        approved: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('allows finalizing and completing checkout signatures', async () => {
    const res = await request(app)
      .post(`/api/v3/contracts/${agreementId}/checkout/complete`)
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.checkoutCompleted).toBe(true);

    const agreement = await RentalAgreement.findByPk(agreementId);
    expect(agreement.checkoutCompletedAt).toBeDefined();
  });

  afterAll(async () => {
    await sequelize.close();
    getRedisClient().disconnect();
  });
});
