process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';
const request = require('supertest');
const app = require('../src/app');
const { User, RentalAgreement, AgreementParty, LedgerRow, UserKycProfile } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis } = require('../src/config/redis');

describe('Renter Journal Aggregator API Integration Tests (NF2)', () => {
  let tenantToken = '';
  let tenant = null;
  let otherToken = '';
  let otherTenant = null;
  let agreement = null;

  beforeAll(async () => {
    // Ensure all dynamic columns (like bio) are created in the test database
    const { ensureUserVerificationColumns } = require('../src/config/database');
    await ensureUserVerificationColumns().catch(() => {});

    // Sync schemas
    await sequelize.sync({ force: false });
    await initRedis().catch(() => {});

    const password = 'Password123!';

    // Register tenant 1 (active journal user)
    const tenantEmail = `tenant-journal-${Date.now()}@example.com`;
    const tRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: tenantEmail,
        password,
        firstName: 'Avi',
        lastName: 'Cohen',
        role: 'tenant',
      });
    tenantToken = tRes.body.token;
    tenant = await User.findOne({ where: { email: tenantEmail } });
    await tenant.update({ isVerified: true });

    // Register tenant 2 (unauthorized editor for tenant 1)
    const otherEmail = `tenant-other-${Date.now()}@example.com`;
    const otRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: otherEmail,
        password,
        firstName: 'Israel',
        lastName: 'Israeli',
        role: 'tenant',
      });
    otherToken = otRes.body.token;
    otherTenant = await User.findOne({ where: { email: otherEmail } });
    await otherTenant.update({ isVerified: true });

    // Create a KYC profile for tenant 1
    await UserKycProfile.create({
      userId: tenant.id,
      status: 'APPROVED',
      personaInquiryId: `inq_t_${Date.now()}`,
    });

    // Create a RentalAgreement
    agreement = await RentalAgreement.create({
      propertyId: '00000000-0000-4000-8000-000000000004',
      landlordId: '00000000-0000-4000-8000-000000000001',
      startDate: '2026-07-01',
      endDate: '2027-06-30',
      monthlyRentIls: 5000,
      paymentDueDay: 1,
      status: 'ACTIVE',
      checkinCompletedAt: new Date(),
    });

    // Invite tenant party
    await AgreementParty.create({
      agreementId: agreement.id,
      userId: tenant.id,
      role: 'tenant',
    });

    // Create ledger rows for tenant 1 (one PAID, one OVERDUE, one PENDING)
    await LedgerRow.create({
      agreementId: agreement.id,
      period: '2026-07',
      dueDate: '2026-07-01',
      amount: 5000,
      status: 'PAID',
    });

    await LedgerRow.create({
      agreementId: agreement.id,
      period: '2026-08',
      dueDate: '2026-08-01',
      amount: 5000,
      status: 'OVERDUE',
    });

    await LedgerRow.create({
      agreementId: agreement.id,
      period: '2026-09',
      dueDate: '2026-09-01',
      amount: 5000,
      status: 'PENDING',
    });
  });

  it('allows any authenticated user to retrieve renter journal of a tenant', async () => {
    const res = await request(app)
      .get(`/api/v3/renter-journal/${tenant.id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.renter.firstName).toBe('Avi');
    expect(res.body.renter.lastName).toBe('Cohen');
    expect(res.body.renter.kycStatus).toBe('APPROVED');
    expect(res.body.contracts).toHaveLength(1);
    expect(res.body.paymentsSummary.paid).toBe(1);
    expect(res.body.paymentsSummary.overdue).toBe(1);
    expect(res.body.paymentsSummary.unpaid).toBe(1); // PENDING
    expect(res.body.checkIn.completedCount).toBe(1);
    expect(res.body.isEditable).toBe(false); // Called by otherTenant
  });

  it('marks isEditable to true when tenant retrieves their own journal', async () => {
    const res = await request(app)
      .get(`/api/v3/renter-journal/${tenant.id}`)
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isEditable).toBe(true);
  });

  it('returns 404 when retrieving renter journal of an invalid user', async () => {
    const res = await request(app)
      .get(`/api/v3/renter-journal/00000000-0000-4000-8000-ffffffffffff`)
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(404);
  });

  it('allows tenant to edit their own profile section (name, bio, avatar)', async () => {
    const res = await request(app)
      .put(`/api/v3/renter-journal/${tenant.id}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        firstName: 'Avraham',
        bio: 'סטודנט להנדסה בטכניון, מחפש דירה שקטה',
        avatarUrl: 'https://example.com/avi-new.jpg',
      });

    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Avraham');
    expect(res.body.bio).toBe('סטודנט להנדסה בטכניון, מחפש דירה שקטה');
    expect(res.body.avatarUrl).toBe('https://example.com/avi-new.jpg');

    // Confirm DB was updated
    const updated = await User.findByPk(tenant.id);
    expect(updated.firstName).toBe('Avraham');
    expect(updated.bio).toBe('סטודנט להנדסה בטכניון, מחפש דירה שקטה');
  });

  it('forbids users from editing profiles of other tenants', async () => {
    const res = await request(app)
      .put(`/api/v3/renter-journal/${tenant.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        firstName: 'HackedName',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('edit your own');

    // Confirm DB was not updated
    const fresh = await User.findByPk(tenant.id);
    expect(fresh.firstName).toBe('Avraham');
  });

  afterAll(async () => {
    await sequelize.close();
  });
});
