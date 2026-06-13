process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';

const { Op } = require('sequelize');
const {
  User,
  Apartment,
  RentalAgreement,
  AgreementParty,
  AgreementRoom,
  LedgerRow,
  TrustScoreEvent,
} = require('../src/models');
const { sequelize } = require('../src/config/database');
const {
  TRUST_EVENTS,
  recalcTrustScoreForAgreement,
  isPaidOnTime,
} = require('../src/services/trustScoreService');
const { confirmPayment } = require('../src/services/ledgerService');

// V2-5 auto-trigger bridged onto the live NF3 event-sourced trust system:
// behaviour-based events fire idempotently through applyTrustEvent.
describe('trustScoreService — behaviour auto-triggers (V2-5 → NF3)', () => {
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

  afterEach(async () => {
    await LedgerRow.destroy({ where: { agreementId: agreement.id } });
    await AgreementRoom.destroy({ where: { agreementId: agreement.id } });
    await TrustScoreEvent.destroy({ where: { userId: { [Op.in]: [tenant.id, landlord.id] } } });
    await agreement.update({ checkoutCompletedAt: null });
    await User.update({ trustScore: 50 }, { where: { id: { [Op.in]: [tenant.id, landlord.id] } } });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('isPaidOnTime only credits rows confirmed on/before due date', () => {
    expect(isPaidOnTime({ status: 'PAID', confirmedByLandlord: '2026-01-05', dueDate: '2026-01-10' })).toBe(true);
    expect(isPaidOnTime({ status: 'PAID', confirmedByLandlord: '2026-01-15', dueDate: '2026-01-10' })).toBe(false);
    expect(isPaidOnTime({ status: 'OVERDUE', confirmedByLandlord: '2026-01-05', dueDate: '2026-01-10' })).toBe(false);
  });

  it('fires rent_paid_on_time for an on-time PAID row', async () => {
    const futureDue = new Date();
    futureDue.setDate(futureDue.getDate() + 10);
    await LedgerRow.create({
      agreementId: agreement.id,
      period: 'on-time',
      dueDate: futureDue.toISOString().split('T')[0],
      amount: 5000,
      status: 'PAID',
      confirmedByLandlord: new Date(),
    });

    await recalcTrustScoreForAgreement(agreement.id);

    const updated = await User.findByPk(tenant.id);
    expect(updated.trustScore).toBe(50 + TRUST_EVENTS.rent_paid_on_time.delta);
  });

  it('is idempotent — re-running does not double-credit the same row', async () => {
    const futureDue = new Date();
    futureDue.setDate(futureDue.getDate() + 10);
    await LedgerRow.create({
      agreementId: agreement.id,
      period: 'on-time',
      dueDate: futureDue.toISOString().split('T')[0],
      amount: 5000,
      status: 'PAID',
      confirmedByLandlord: new Date(),
    });

    await recalcTrustScoreForAgreement(agreement.id);
    await recalcTrustScoreForAgreement(agreement.id);

    const updated = await User.findByPk(tenant.id);
    expect(updated.trustScore).toBe(50 + TRUST_EVENTS.rent_paid_on_time.delta);
    const events = await TrustScoreEvent.count({
      where: { userId: tenant.id, eventKey: 'rent_paid_on_time' },
    });
    expect(events).toBe(1);
  });

  it('does not credit a late payment', async () => {
    await LedgerRow.create({
      agreementId: agreement.id,
      period: 'late',
      dueDate: '2020-01-01',
      amount: 5000,
      status: 'PAID',
      confirmedByLandlord: new Date(),
    });

    await recalcTrustScoreForAgreement(agreement.id);

    const updated = await User.findByPk(tenant.id);
    expect(updated.trustScore).toBe(50);
  });

  it('fires checkin_checkout_clean for a damage-free checkout', async () => {
    await AgreementRoom.create({ agreementId: agreement.id, name: 'סלון', checkoutNotes: null });
    await agreement.update({ checkoutCompletedAt: new Date() });

    await recalcTrustScoreForAgreement(agreement.id);

    const updated = await User.findByPk(tenant.id);
    expect(updated.trustScore).toBe(50 + TRUST_EVENTS.checkin_checkout_clean.delta);
  });

  it('does not reward checkout when a room has damage notes', async () => {
    await AgreementRoom.create({ agreementId: agreement.id, name: 'סלון', checkoutNotes: 'נזק בקיר' });
    await agreement.update({ checkoutCompletedAt: new Date() });

    await recalcTrustScoreForAgreement(agreement.id);

    const updated = await User.findByPk(tenant.id);
    expect(updated.trustScore).toBe(50);
  });

  it('confirmPayment hook raises tenant trust score on time', async () => {
    const futureDue = new Date();
    futureDue.setDate(futureDue.getDate() + 30);
    const row = await LedgerRow.create({
      agreementId: agreement.id,
      period: 'hook-test',
      dueDate: futureDue.toISOString().split('T')[0],
      amount: 5000,
      status: 'REPORTED',
      reportedByTenant: new Date(),
    });

    await confirmPayment(row.id, { id: landlord.id, role: 'landlord' });

    const updated = await User.findByPk(tenant.id);
    expect(updated.trustScore).toBe(50 + TRUST_EVENTS.rent_paid_on_time.delta);
  });
});
