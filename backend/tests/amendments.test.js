process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';
const request = require('supertest');
const app = require('../src/app');
const { User, RentalAgreement, AgreementParty, ContractAmendment } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis } = require('../src/config/redis');

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

describe('Contract Amendments Integration Tests (V2-3)', () => {
  let landlordToken = '';
  let landlord = null;
  let tenantToken = '';
  let tenant = null;
  let agreement = null;

  beforeAll(async () => {
    // Sync schemas
    await sequelize.sync({ force: false });
    await initRedis().catch(() => {});

    const password = 'Password123!';

    // Register landlord
    const landlordEmail = `landlord-amend-${Date.now()}@example.com`;
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
    const tenantEmail = `tenant-amend-${Date.now()}@example.com`;
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

    // Create a RentalAgreement
    agreement = await RentalAgreement.create({
      propertyId: '00000000-0000-4000-8000-000000000003',
      landlordId: landlord.id,
      startDate: '2026-07-01',
      endDate: '2027-06-30',
      monthlyRentIls: 5000,
      paymentDueDay: 1,
      status: 'UPLOAD',
    });

    // Invite tenant party
    await AgreementParty.create({
      agreementId: agreement.id,
      userId: tenant.id,
      role: 'tenant',
    });
  });

  it('fails to propose an amendment when contract is not ACTIVE', async () => {
    const res = await request(app)
      .post(`/api/v3/contracts/${agreement.id}/amend/propose`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        field: 'monthlyRentIls',
        newValue: '6000',
        reason: 'Adjusting to market rate',
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('ACTIVE');
  });

  it('allows proposing an amendment when contract is ACTIVE', async () => {
    // Force active in DB
    await agreement.update({ status: 'ACTIVE' });

    const res = await request(app)
      .post(`/api/v3/contracts/${agreement.id}/amend/propose`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        field: 'monthlyRentIls',
        newValue: '6000',
        reason: 'Adjusting to market rate',
      });

    expect(res.status).toBe(201);
    expect(res.body.field).toBe('monthlyRentIls');
    expect(res.body.newValue).toBe('6000');
    expect(parseFloat(res.body.oldValue)).toBe(5000);
    expect(res.body.status).toBe('pending');
  });

  it('fails to propose with invalid fields', async () => {
    const res = await request(app)
      .post(`/api/v3/contracts/${agreement.id}/amend/propose`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        field: 'invalidField',
        newValue: '123',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Field must be one of');
  });

  it('allows the other party to approve a pending amendment and updates agreement value', async () => {
    // Propose an amendment from landlord
    const propRes = await request(app)
      .post(`/api/v3/contracts/${agreement.id}/amend/propose`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        field: 'paymentDueDay',
        newValue: '10',
        reason: 'Align with salary payment date',
      });
    expect(propRes.status).toBe(201);
    const amendmentId = propRes.body.id;

    // Landlord trying to approve their own proposal should fail
    const selfApprove = await request(app)
      .post(`/api/v3/contracts/${agreement.id}/amend/${amendmentId}/approve`)
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(selfApprove.status).toBe(403);

    // Tenant approves
    const approveRes = await request(app)
      .post(`/api/v3/contracts/${agreement.id}/amend/${amendmentId}/approve`)
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('approved');

    // Verify agreement is updated
    const updatedAgreement = await RentalAgreement.findByPk(agreement.id);
    expect(updatedAgreement.paymentDueDay).toBe(10);
  });

  it('allows rejecting a proposed amendment', async () => {
    // Propose from tenant
    const propRes = await request(app)
      .post(`/api/v3/contracts/${agreement.id}/amend/propose`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        field: 'monthlyRentIls',
        newValue: '4500',
        reason: 'Covid discount plea',
      });
    expect(propRes.status).toBe(201);
    const amendmentId = propRes.body.id;

    // Landlord rejects
    const rejectRes = await request(app)
      .post(`/api/v3/contracts/${agreement.id}/amend/${amendmentId}/reject`)
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe('rejected');

    // Verify agreement remains unchanged
    const finalAgreement = await RentalAgreement.findByPk(agreement.id);
    expect(parseFloat(finalAgreement.monthlyRentIls)).toBe(5000); // 5000 was set by initial seed update
  });

  it('validates the maximum amendment limit of 10', async () => {
    // Currently we have 3 amendments in database (1 approved, 1 rejected, 1 pending monthlyRentIls).
    // Let's create more to reach 10
    const count = await ContractAmendment.count({ where: { contractId: agreement.id } });
    const remaining = 10 - count;

    for (let i = 0; i < remaining; i++) {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/amend/propose`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          field: 'paymentDueDay',
          newValue: String(11 + i),
        });
      expect(res.status).toBe(201);
    }

    // Proposing 11th should fail
    const overLimitRes = await request(app)
      .post(`/api/v3/contracts/${agreement.id}/amend/propose`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        field: 'paymentDueDay',
        newValue: '5',
      });

    expect(overLimitRes.status).toBe(422);
    expect(overLimitRes.body.error).toContain('Maximum limit of 10 amendments');
  });

  afterAll(async () => {
    await sequelize.close();
  });
});
