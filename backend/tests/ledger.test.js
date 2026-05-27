process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests_over_twenty_chars';
const { describe, it, expect, beforeEach, afterAll, beforeAll } = require('@jest/globals');
const request = require('supertest');
const app = require('../src/app');
const { User, RentalAgreement, LedgerRow } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis } = require('../src/config/redis');

describe('Ledger Service Integration', () => {
  let landlordToken = '';
  let tenantToken = '';
  let agreement = null;
  let ledgerRow = null;

  beforeAll(async () => {
    // Drop table to ensure clean schema recreation
    await sequelize.getQueryInterface().dropTable('ledger_rows', { cascade: true }).catch(() => {});
    await sequelize.getQueryInterface().dropTable('rental_agreements', { cascade: true }).catch(() => {});

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
    const llUser = await User.findOne({ where: { email: landlordEmail } });
    await llUser.update({ isVerified: true });

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
    const tUser = await User.findOne({ where: { email: tenantEmail } });
    await tUser.update({ isVerified: true });

    // Create rental agreement directly
    try {
      agreement = await RentalAgreement.create({
        landlordId: llUser.id,
        propertyId: '00000000-0000-4000-9000-000000000002',
        status: 'ACTIVE',
        startDate: '2026-07-01',
        endDate: '2027-06-30',
        monthlyRentIls: 5000.00,
        paymentDueDay: 10,
      });
    } catch (err) {
      console.error('DATABASE ERROR CREATING AGREEMENT:', err);
      throw err;
    }
  });

  it('generates 12 rent ledger rows for a 1-year active contract', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/generate/${agreement.id}`)
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(201);
    expect(res.body.generated).toBe(12);

    const rows = await LedgerRow.findAll({ where: { agreementId: agreement.id } });
    expect(rows.length).toBe(12);
    ledgerRow = rows[0];
  });

  it('allows tenant to report payment for a ledger row', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/${ledgerRow.id}/report`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REPORTED');
  });

  it('allows landlord to confirm reported payment', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/${ledgerRow.id}/confirm`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PAID');
  });

  it('allows landlord to reject a payment resetting it back to PENDING', async () => {
    const nextRow = await LedgerRow.findOne({ where: { agreementId: agreement.id, status: 'PENDING' } });
    
    // First report it
    await request(app)
      .post(`/api/v3/ledger/${nextRow.id}/report`)
      .set('Authorization', `Bearer ${tenantToken}`);

    // Reject it
    const res = await request(app)
      .post(`/api/v3/ledger/${nextRow.id}/reject`)
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDING');
  });

  afterAll(async () => {
    await sequelize.close();
  });
});
