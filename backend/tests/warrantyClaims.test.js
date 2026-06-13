process.env.JWT_SECRET = 'test_jwt_secret_for_warranty_claims';

jest.mock('../src/services/notificationService', () => ({
  notify: jest.fn().mockResolvedValue({ push: null, email: null }),
  notifyMany: jest.fn().mockResolvedValue([]),
  scheduleReminder: jest.fn(),
  cancelReminder: jest.fn(),
}));

jest.mock('../src/services/resendService', () => ({
  sendGuarantorInvite: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendPaymentReminder: jest.fn().mockResolvedValue(undefined),
  sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const {
  User,
  RentalAgreement,
  Apartment,
  AgreementGuarantor,
  WarrantyClaim,
} = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const { notify } = require('../src/services/notificationService');
const { generateStrongTestPassword } = require('./helpers/testCredentials');

let landlord;
let otherLandlord;
let tenant;
let apartment;
let agreement;
let guarantor;
let landlordToken;
let otherLandlordToken;
let adminToken;
let invitationToken;

beforeAll(async () => {
  await sequelize.sync({ force: false });
  await initRedis().catch(() => {});

  const password = generateStrongTestPassword();
  const unique = Date.now();

  landlord = await User.create({
    email: `claims-ll-${unique}@test.com`,
    passwordHash: 'hash',
    firstName: 'LL',
    lastName: 'Claims',
    role: 'landlord',
    isVerified: true,
    tosAcceptedAt: new Date(),
  });

  otherLandlord = await User.create({
    email: `claims-other-${unique}@test.com`,
    passwordHash: 'hash',
    firstName: 'Other',
    lastName: 'LL',
    role: 'landlord',
    isVerified: true,
    tosAcceptedAt: new Date(),
  });

  tenant = await User.create({
    email: `claims-t-${unique}@test.com`,
    passwordHash: 'hash',
    firstName: 'TN',
    lastName: 'User',
    role: 'tenant',
    isVerified: true,
  });

  const admin = await User.create({
    email: `claims-admin-${unique}@test.com`,
    passwordHash: 'hash',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isVerified: true,
  });

  apartment = await Apartment.create({
    landlordId: landlord.id,
    title: 'Claims test apt',
    city: 'Tel Aviv',
    price: 5000,
    rooms: 3,
  });

  agreement = await RentalAgreement.create({
    landlordId: landlord.id,
    propertyId: apartment.id,
    status: 'ACTIVE',
    monthlyRentIls: 5000,
    startDate: '2026-01-01',
    endDate: '2027-01-01',
  });

  guarantor = await AgreementGuarantor.create({
    agreementId: agreement.id,
    email: 'guarantor-claims@test.com',
    name: 'Israel Israeli',
    invitationExpiresAt: new Date(Date.now() + 5 * 86400000),
    invitationStatus: 'APPROVED',
    signedAt: new Date(),
  });
  invitationToken = guarantor.invitationToken;

  landlordToken = jwt.sign({ id: landlord.id, role: 'landlord' }, process.env.JWT_SECRET);
  otherLandlordToken = jwt.sign({ id: otherLandlord.id, role: 'landlord' }, process.env.JWT_SECRET);
  adminToken = jwt.sign({ id: admin.id, role: 'admin' }, process.env.JWT_SECRET);
}, 30_000);

afterAll(async () => {
  await WarrantyClaim.destroy({ where: { agreementId: agreement.id } });
  await sequelize.close();
  const redis = getRedisClient();
  if (redis) redis.disconnect();
});

beforeEach(() => {
  notify.mockClear();
  notify.mockResolvedValue({ push: null, email: null });
});

describe('POST /api/v3/claims', () => {
  it('allows landlord to file a claim on their agreement', async () => {
    const res = await request(app)
      .post('/api/v3/claims')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        agreementId: agreement.id,
        guarantorId: guarantor.id,
        amount: 1500,
        reason: 'נזק לריהוט בסלון',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('FILED');
    expect(parseFloat(res.body.amount)).toBe(1500);
    expect(notify).toHaveBeenCalled();
  });

  it('blocks IDOR — other landlord cannot file on foreign agreement', async () => {
    const res = await request(app)
      .post('/api/v3/claims')
      .set('Authorization', `Bearer ${otherLandlordToken}`)
      .send({
        agreementId: agreement.id,
        guarantorId: guarantor.id,
        amount: 999,
        reason: 'ניסיון גישה לא מורשית',
      });

    expect(res.status).toBe(404);
  });
});

describe('Guarantor response', () => {
  let claimId;

  beforeEach(async () => {
    await WarrantyClaim.destroy({ where: { agreementId: agreement.id } });
    const claim = await WarrantyClaim.create({
      agreementId: agreement.id,
      guarantorId: guarantor.id,
      amount: 2000,
      reason: 'חוב שכירות',
      status: 'FILED',
      filedByUserId: landlord.id,
    });
    claimId = claim.id;
  });

  it('guarantor can accept with valid invitation token', async () => {
    const res = await request(app)
      .post(`/api/v3/claims/${claimId}/guarantor/accept`)
      .send({ invitationToken });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACCEPTED');
    expect(notify).toHaveBeenCalledWith(
      landlord.id,
      expect.objectContaining({ title: expect.stringContaining('אישר') })
    );
  });

  it('guarantor can dispute with valid invitation token', async () => {
    const res = await request(app)
      .post(`/api/v3/claims/${claimId}/guarantor/dispute`)
      .send({ invitationToken });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DISPUTED');
    expect(notify).toHaveBeenCalled();
  });

  it('rejects invalid guarantor token', async () => {
    const res = await request(app)
      .post(`/api/v3/claims/${claimId}/guarantor/dispute`)
      .send({ invitationToken: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(403);
  });
});

describe('Admin resolve', () => {
  it('admin can resolve a disputed claim', async () => {
    const claim = await WarrantyClaim.create({
      agreementId: agreement.id,
      guarantorId: guarantor.id,
      amount: 3000,
      reason: 'פיצוי',
      status: 'DISPUTED',
      filedByUserId: landlord.id,
    });

    const res = await request(app)
      .post(`/api/v3/claims/${claim.id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolutionNote: 'פשרה מוסכמת' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('RESOLVED');
    expect(res.body.resolutionNote).toBe('פשרה מוסכמת');
    expect(notify).toHaveBeenCalled();
  });
});

describe('GET /api/v3/claims', () => {
  it('landlord lists only their claims', async () => {
    const res = await request(app)
      .get('/api/v3/claims')
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((c) => c.agreementId === agreement.id)).toBe(true);
  });
});
