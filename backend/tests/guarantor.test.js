process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';
const request = require('supertest');
const app = require('../src/app');
const { User, AgreementGuarantor, RentalAgreement } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');

describe('Guarantor Flow (M7)', () => {
  let landlordToken = '';
  let landlord = null;
  let invitationToken = '';
  const agreementId = '00000000-0000-4000-9000-000000000001'; // Mock agreement ID

  beforeAll(async () => {
    // Drop table to ensure clean schema recreation
    await sequelize.getQueryInterface().dropTable('agreement_guarantors').catch(() => {});

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

    // Seed mock rental agreement for guarantor invite
    await RentalAgreement.destroy({ where: { id: agreementId } }).catch(() => {});
    await RentalAgreement.create({
      id: agreementId,
      landlordId: landlord.id,
      propertyId: '00000000-0000-4000-8000-000000000001',
      monthlyRentIls: 5000,
      startDate: '2026-07-01',
      endDate: '2027-06-30',
      extractedFields: { address: 'רחוב הרצל 5, תל אביב' }
    });
  });

  it('allows landlord to invite a guarantor', async () => {
    const res = await request(app)
      .post('/api/v3/guarantor/invite')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        agreementId,
        email: 'guarantor@example.com',
        name: 'Israel Israeli',
      });
    expect(res.status).toBe(201);
    expect(res.body.guarantor.email).toBe('guarantor@example.com');
    expect(res.body.guarantor.name).toBe('Israel Israeli');
    expect(res.body.guarantor.invitationStatus).toBe('PENDING');
    invitationToken = res.body.guarantor.invitationToken;
    expect(invitationToken).toBeDefined();
  });

  it('allows retrieving guarantor flow details publicly using token', async () => {
    const res = await request(app)
      .get(`/api/v3/guarantor/flow/${invitationToken}`);
    expect(res.status).toBe(200);
    expect(res.body.guarantorName).toBe('Israel Israeli');
    expect(res.body.propertyAddress).toBeDefined();
    expect(res.body.rentAmount).toBeDefined();
  });

  it('allows guarantor to decline the invitation', async () => {
    const res = await request(app)
      .post(`/api/v3/guarantor/flow/${invitationToken}/decline`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('declined');

    const g = await AgreementGuarantor.findOne({ where: { invitationToken } });
    expect(g.invitationStatus).toBe('DECLINED');
  });

  it('allows guarantor to complete verification and sign', async () => {
    const res = await request(app)
      .post(`/api/v3/guarantor/flow/${invitationToken}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');

    const g = await AgreementGuarantor.findOne({ where: { invitationToken } });
    expect(g.invitationStatus).toBe('APPROVED');
    expect(g.signedAt).toBeDefined();
  });

  afterAll(async () => {
    await sequelize.close();
    getRedisClient().disconnect();
  });
});

