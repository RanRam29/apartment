process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';

const {
  User,
  Apartment,
  RentalAgreement,
  AgreementParty,
  AgreementRoom,
  LedgerRow,
  MaintenanceTicket,
} = require('../src/models');
const { sequelize } = require('../src/config/database');
const { recalcTrustScore, clampScore, SCORE } = require('../src/services/trustScoreService');
const { confirmPayment } = require('../src/services/ledgerService');

describe('trustScoreService', () => {
  let landlord;
  let tenant;
  let apartment;
  let agreement;

  beforeAll(async () => {
    await sequelize.sync({ force: false });
    const unique = Date.now();

    landlord = await User.create({
      email: `ts-ll-${unique}@test.com`,
      passwordHash: 'hash',
      firstName: 'LL',
      lastName: 'User',
      role: 'landlord',
      trustScore: 50,
    });

    tenant = await User.create({
      email: `ts-t-${unique}@test.com`,
      passwordHash: 'hash',
      firstName: 'TN',
      lastName: 'User',
      role: 'tenant',
      trustScore: 50,
    });

    apartment = await Apartment.create({
      landlordId: landlord.id,
      title: 'Trust score test',
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

    await AgreementParty.create({
      agreementId: agreement.id,
      userId: tenant.id,
      role: 'tenant',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('clampScore keeps values within 0-100', () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(72.4)).toBe(72);
  });

  it('applies overdue penalty and on-time payment bonus', async () => {
    await LedgerRow.destroy({ where: { agreementId: agreement.id } });
    await AgreementRoom.destroy({ where: { agreementId: agreement.id } });
    await agreement.update({ checkoutCompletedAt: null });
    await tenant.update({ trustScore: 50 });

    const futureDue = new Date();
    futureDue.setDate(futureDue.getDate() + 10);

    await LedgerRow.bulkCreate([
      {
        agreementId: agreement.id,
        period: 'overdue',
        dueDate: '2020-01-01',
        amount: 5000,
        status: 'OVERDUE',
      },
      {
        agreementId: agreement.id,
        period: 'on-time',
        dueDate: futureDue.toISOString().split('T')[0],
        amount: 5000,
        status: 'PAID',
        confirmedByLandlord: new Date(),
      },
    ]);

    const score = await recalcTrustScore(tenant.id);
    expect(score).toBe(50 - SCORE.OVERDUE_PENALTY + SCORE.ON_TIME_BONUS);

    const updated = await User.findByPk(tenant.id);
    expect(updated.trustScore).toBe(score);
  });

  it('rewards clean checkout completion', async () => {
    await LedgerRow.destroy({ where: { agreementId: agreement.id } });
    await tenant.update({ trustScore: 50 });
    await AgreementRoom.destroy({ where: { agreementId: agreement.id } });
    await AgreementRoom.create({
      agreementId: agreement.id,
      name: 'סלון',
      checkoutNotes: null,
    });
    await agreement.update({ checkoutCompletedAt: new Date() });

    const score = await recalcTrustScore(tenant.id);
    expect(score).toBeGreaterThanOrEqual(50 + SCORE.CLEAN_CHECKOUT_BONUS);
  });

  it('rewards landlord for closed maintenance tickets', async () => {
    await landlord.update({ trustScore: 50 });
    await MaintenanceTicket.create({
      agreementId: agreement.id,
      reporterId: tenant.id,
      description: 'דליפה',
      status: 'CLOSED',
      landlordResponse: 'handling',
    });

    const score = await recalcTrustScore(landlord.id);
    expect(score).toBeGreaterThanOrEqual(50 + SCORE.MAINTENANCE_HANDLED_BONUS);
  });

  it('recalcs tenant score after confirmPayment hook', async () => {
    await tenant.update({ trustScore: 50 });
    const row = await LedgerRow.create({
      agreementId: agreement.id,
      period: 'hook-test',
      dueDate: '2030-06-01',
      amount: 5000,
      status: 'REPORTED',
      reportedByTenant: new Date(),
    });

    await confirmPayment(row.id, { id: landlord.id, role: 'landlord' });

    const updated = await User.findByPk(tenant.id);
    expect(updated.trustScore).toBeGreaterThan(50);
  });
});
