/**
 * Financial cron adoption of scheduleReminder / cancelReminder.
 */
process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_financial_scheduled';

jest.mock('../src/services/whatsappNotificationService', () => ({
  sendPaymentReminder3Days: jest.fn().mockResolvedValue(undefined),
  sendPaymentReminderToday: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/resendService', () => ({
  sendGuarantorInvite: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendPaymentReminder: jest.fn().mockResolvedValue(undefined),
  sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockScheduleReminder = jest.fn().mockResolvedValue({ id: 'sched-1' });
const mockCancelReminder = jest.fn().mockResolvedValue(true);

jest.mock('../src/services/notificationService', () => {
  const actual = jest.requireActual('../src/services/notificationService');
  return {
    ...actual,
    scheduleReminder: (...args) => mockScheduleReminder(...args),
    cancelReminder: (...args) => mockCancelReminder(...args),
  };
});

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../src/config/database');
const app = require('../src/app');
const {
  User,
  Apartment,
  RentalAgreement,
  LedgerRow,
  AgreementParty,
  ScheduledNotification,
} = require('../src/models');
const { runLedgerDueAlerts } = require('../src/cron/ledgerDueAlerts');
const { confirmPayment } = require('../src/services/ledgerService');

let landlord;
let tenant;
let apartment;
let landlordToken;

beforeAll(async () => {
  await sequelize.sync({ force: false });

  const unique = Date.now();

  landlord = await User.create({
    email: `fin-ll-${unique}@test.com`,
    passwordHash: 'hash',
    firstName: 'Land',
    lastName: 'Lord',
    role: 'landlord',
    isVerified: true,
    tosAcceptedAt: new Date(),
  });

  tenant = await User.create({
    email: `fin-t-${unique}@test.com`,
    passwordHash: 'hash',
    firstName: 'Ten',
    lastName: 'Ant',
    role: 'tenant',
    isVerified: true,
    tosAcceptedAt: new Date(),
  });

  apartment = await Apartment.create({
    landlordId: landlord.id,
    title: 'Fin sched test',
    city: 'Tel Aviv',
    price: 5000,
    rooms: 3,
  });

  landlordToken = jwt.sign({ id: landlord.id, role: 'landlord' }, process.env.JWT_SECRET);
}, 30_000);

afterAll(async () => {
  await sequelize.close();
});

beforeEach(() => {
  mockScheduleReminder.mockClear();
  mockCancelReminder.mockClear();
  mockScheduleReminder.mockResolvedValue({ id: 'sched-1' });
  mockCancelReminder.mockResolvedValue(true);
});

describe('ledgerDueAlerts scheduled notifications', () => {
  it('schedules T-3 payment reminder with dedupeKey ledger:{rowId}:due3d', async () => {
    const agreement = await RentalAgreement.create({
      landlordId: landlord.id,
      propertyId: apartment.id,
      status: 'ACTIVE',
      monthlyRentIls: 5000,
      startDate: '2026-07-01',
      endDate: '2027-06-30',
    });

    await AgreementParty.create({
      agreementId: agreement.id,
      userId: tenant.id,
      role: 'tenant',
    });

    const dueIn3Days = new Date();
    dueIn3Days.setDate(dueIn3Days.getDate() + 3);
    const dueDateStr = dueIn3Days.toISOString().split('T')[0];

    const row = await LedgerRow.create({
      agreementId: agreement.id,
      period: 'בדיקה',
      dueDate: dueDateStr,
      amount: 5000,
      status: 'PENDING',
    });

    await runLedgerDueAlerts();

    expect(mockScheduleReminder).toHaveBeenCalledWith(
      tenant.id,
      expect.any(Date),
      expect.objectContaining({
        title: expect.stringContaining('תזכורת'),
        data: expect.objectContaining({ ledgerRowId: row.id }),
      }),
      { dedupeKey: `ledger:${row.id}:due3d` }
    );
  });
});

describe('confirmPayment cancels scheduled T-3 reminder', () => {
  it('calls cancelReminder with ledger dedupeKey when marked PAID', async () => {
    const agreement = await RentalAgreement.create({
      landlordId: landlord.id,
      propertyId: apartment.id,
      status: 'ACTIVE',
      monthlyRentIls: 5000,
      startDate: '2026-07-01',
      endDate: '2027-06-30',
    });

    const row = await LedgerRow.create({
      agreementId: agreement.id,
      period: 'בדיקה',
      dueDate: '2026-12-01',
      amount: 5000,
      status: 'REPORTED',
      reportedByTenant: new Date(),
    });

    await confirmPayment(row.id, { id: landlord.id, role: 'landlord' });

    expect(mockCancelReminder).toHaveBeenCalledWith({ dedupeKey: `ledger:${row.id}:due3d` });
  });
});

describe('guarantor invite schedules 24h expiry reminder', () => {
  it('schedules landlord reminder with guarantor:{id}:expiry24h dedupeKey', async () => {
    const agreement = await RentalAgreement.create({
      landlordId: landlord.id,
      propertyId: apartment.id,
      status: 'ACTIVE',
      monthlyRentIls: 5000,
      startDate: '2026-07-01',
      endDate: '2027-06-30',
    });

    const res = await request(app)
      .post('/api/v3/guarantor/invite')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        agreementId: agreement.id,
        email: 'guarantor-fin@test.com',
        name: 'Israel Israeli',
      });

    expect(res.status).toBe(201);
    const guarantorId = res.body.guarantor.id;

    expect(mockScheduleReminder).toHaveBeenCalledWith(
      landlord.id,
      expect.any(Date),
      expect.objectContaining({
        body: expect.stringContaining('24'),
        data: expect.objectContaining({ guarantorId, agreementId: agreement.id }),
      }),
      { dedupeKey: `guarantor:${guarantorId}:expiry24h` }
    );

    await ScheduledNotification.destroy({ where: { dedupeKey: `guarantor:${guarantorId}:expiry24h` } });
  });
});
