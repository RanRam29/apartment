process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_ledger_seed';

const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/config/database');
const { seedLedgerRows } = require('../src/services/ledgerSeedService');
const { RentalAgreement, LedgerRow, User, Apartment } = require('../src/models');

describe('ledgerSeedService', () => {
  let agreement;
  let landlord;
  let apartment;

  beforeAll(async () => {
    const { ensureRentalAgreementLifecycleColumns } = require('../src/config/database');
    await sequelize.sync({ alter: false });
    await ensureRentalAgreementLifecycleColumns();

    const hash = await bcrypt.hash('Test1234!', 12);
    const ts = Date.now();

    [landlord] = await User.findOrCreate({
      where: { email: `ledger_landlord_${ts}@test.com` },
      defaults: {
        email: `ledger_landlord_${ts}@test.com`,
        passwordHash: hash,
        firstName: 'Ledger',
        lastName: 'Landlord',
        role: 'landlord',
        isVerified: true,
      },
    });

    [apartment] = await Apartment.findOrCreate({
      where: { title: `Ledger Apt ${ts}`, landlordId: landlord.id },
      defaults: {
        title: `Ledger Apt ${ts}`,
        landlordId: landlord.id,
        price: 6500,
        rooms: 3,
        city: 'Tel Aviv',
      },
    });

    agreement = await RentalAgreement.create({
      landlordId: landlord.id,
      propertyId: apartment.id,
      status: 'READY_SIGN',
      startDate: '2026-08-01',
      endDate: '2027-07-31',
      monthlyRentIls: 6500,
      paymentDueDay: 5,
    });
  }, 30_000);

  afterAll(async () => {
    if (agreement) {
      await LedgerRow.destroy({ where: { agreementId: agreement.id } });
      await agreement.destroy();
    }
    await sequelize.close();
  });

  it('creates 12 ledger rows for a 12-month lease', async () => {
    const created = await seedLedgerRows(agreement);
    expect(created.length).toBe(12);

    const count = await LedgerRow.count({ where: { agreementId: agreement.id } });
    expect(count).toBe(12);

    const first = await LedgerRow.findOne({
      where: { agreementId: agreement.id, period: '2026-08' },
    });
    expect(first).toBeTruthy();
    expect(Number(first.amount)).toBe(6500);
    expect(first.status).toBe('PENDING');
    expect(first.dueDate).toBe('2026-08-05');
  });

  it('is idempotent — second call creates no duplicates', async () => {
    const created = await seedLedgerRows(agreement);
    expect(created.length).toBe(0);

    const count = await LedgerRow.count({ where: { agreementId: agreement.id } });
    expect(count).toBe(12);
  });
});
