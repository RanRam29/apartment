process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';

const { sequelize, initPostgres } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const {
  User,
  Apartment,
  RentalAgreement,
  UserKycProfile,
  LedgerRow,
  MaintenanceTicket,
  AgreementParty,
} = require('../src/models');

// Import Cron Jobs
const { runKycRenewal } = require('../src/cron/kycRenewal');
const { runCpiAdjustment } = require('../src/cron/cpiAdjustment');
const { runExpiringAlerts } = require('../src/cron/expiringAlerts');
const { runPaymentAutoConfirm } = require('../src/cron/paymentAutoConfirm');
const { runR2Cleanup } = require('../src/cron/r2Cleanup');
const { runLedgerDueAlerts } = require('../src/cron/ledgerDueAlerts');
const { runLedgerOverdue } = require('../src/cron/ledgerOverdue');
const { runMaintenanceAlerts } = require('../src/cron/maintenanceAlerts');
const logger = require('../src/utils/logger');

describe('V3 Platform Cron Jobs E2E Integration Suite', () => {
  let landlord = null;
  let tenant = null;
  let testApartment = null;

  beforeAll(async () => {
    await initPostgres();
    await initRedis().catch(() => {});
    
    // Clear and sync DB cleanly
    await sequelize.sync({ force: false });

    // Seed basic landlord and tenant
    const uniqueId = Date.now();
    landlord = await User.create({
      email: `ll-cron-${uniqueId}@test.com`,
      passwordHash: 'dummy',
      firstName: 'Landlord',
      lastName: 'User',
      role: 'landlord',
      isVerified: true,
      tosAcceptedAt: new Date(),
    });

    tenant = await User.create({
      email: `t-cron-${uniqueId}@test.com`,
      passwordHash: 'dummy',
      firstName: 'Tenant',
      lastName: 'User',
      role: 'tenant',
      isVerified: true,
      tosAcceptedAt: new Date(),
    });

    testApartment = await Apartment.create({
      landlordId: landlord.id,
      title: 'Cron Test Apartment',
      city: 'Tel Aviv',
      price: 5000,
      rooms: 3,
    });
  }, 30_000);

  afterAll(async () => {
    await sequelize.close();
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.disconnect();
    }
  });

  beforeEach(async () => {
    const { Op } = require('sequelize');
    const agreements = await RentalAgreement.findAll({
      where: { landlordId: landlord.id },
      attributes: ['id'],
    });
    const agreementIds = agreements.map((a) => a.id);

    if (agreementIds.length > 0) {
      await LedgerRow.destroy({ where: { agreementId: { [Op.in]: agreementIds } } }).catch(() => {});
      await MaintenanceTicket.destroy({ where: { agreementId: { [Op.in]: agreementIds } } }).catch(() => {});
      await AgreementParty.destroy({ where: { agreementId: { [Op.in]: agreementIds } } }).catch(() => {});
      await RentalAgreement.destroy({ where: { id: { [Op.in]: agreementIds } } }).catch(() => {});
    }

    await UserKycProfile.destroy({
      where: { userId: { [Op.in]: [landlord.id, tenant.id] } },
    }).catch(() => {});
  });

  describe('runKycRenewal', () => {
    it('resets KYC profiles to PENDING if they were approved more than 5 years ago', async () => {
      const fiveYearsAndOneDayAgo = new Date();
      fiveYearsAndOneDayAgo.setFullYear(fiveYearsAndOneDayAgo.getFullYear() - 5);
      fiveYearsAndOneDayAgo.setDate(fiveYearsAndOneDayAgo.getDate() - 1);

      const kyc = await UserKycProfile.create({
        userId: tenant.id,
        status: 'APPROVED',
        personaInquiryId: 'inq_old_kyc',
      });
      await sequelize.query('UPDATE user_kyc_profiles SET created_at = :date WHERE id = :id', {
        replacements: { date: fiveYearsAndOneDayAgo, id: kyc.id }
      });

      await runKycRenewal();

      const reloaded = await UserKycProfile.findByPk(kyc.id);
      expect(reloaded.status).toBe('PENDING');
    });

    it('leaves modern approved KYC profiles untouched', async () => {
      const kyc = await UserKycProfile.create({
        userId: tenant.id,
        status: 'APPROVED',
        personaInquiryId: 'inq_fresh_kyc',
      });

      await runKycRenewal();

      const reloaded = await UserKycProfile.findByPk(kyc.id);
      expect(reloaded.status).toBe('APPROVED');
    });
  });

  describe('runCpiAdjustment', () => {
    it('adjusts pending rent amounts for cpiLinked active/expiring agreements by 3%', async () => {
      const agreement = await RentalAgreement.create({
        landlordId: landlord.id,
        propertyId: testApartment.id,
        status: 'ACTIVE',
        monthlyRentIls: 5000.00,
        startDate: '2026-07-01',
        endDate: '2027-06-30',
        cpiLinked: true,
      });

      const row = await LedgerRow.create({
        agreementId: agreement.id,
        period: 'מרץ 2027',
        dueDate: '2027-03-01',
        amount: 5000.00,
        status: 'PENDING',
      });

      await runCpiAdjustment();

      const reloaded = await LedgerRow.findByPk(row.id);
      expect(parseFloat(reloaded.cpiAdjustment)).toBe(150.00);
      expect(parseFloat(reloaded.amount)).toBe(5150.00);
      expect(reloaded.notes).toContain('CPI adjustment +3%');
    });

    it('leaves unlinked agreements untouched', async () => {
      const agreement = await RentalAgreement.create({
        landlordId: landlord.id,
        propertyId: testApartment.id,
        status: 'ACTIVE',
        monthlyRentIls: 5000.00,
        startDate: '2026-07-01',
        endDate: '2027-06-30',
        cpiLinked: false,
      });

      const row = await LedgerRow.create({
        agreementId: agreement.id,
        period: 'מרץ 2027',
        dueDate: '2027-03-01',
        amount: 5000.00,
        status: 'PENDING',
      });

      await runCpiAdjustment();

      const reloaded = await LedgerRow.findByPk(row.id);
      expect(parseFloat(reloaded.amount)).toBe(5000.00);
      expect(parseFloat(reloaded.cpiAdjustment)).toBe(0);
    });
  });

  describe('runExpiringAlerts', () => {
    it('transitions ACTIVE agreements to EXPIRING if ending exactly 120 days from now', async () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 120);
      const dateStr = targetDate.toISOString().split('T')[0];

      const agreement = await RentalAgreement.create({
        landlordId: landlord.id,
        propertyId: testApartment.id,
        status: 'ACTIVE',
        startDate: '2026-01-01',
        endDate: dateStr,
        monthlyRentIls: 4000.00,
      });

      // Add mock agreement tenant party
      await AgreementParty.create({
        agreementId: agreement.id,
        userId: tenant.id,
        role: 'tenant',
      });

      const logSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

      await runExpiringAlerts();

      const reloaded = await RentalAgreement.findByPk(agreement.id);
      expect(reloaded.status).toBe('EXPIRING');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('notifying 2 users'));

      logSpy.mockRestore();
    });
  });

  describe('runPaymentAutoConfirm', () => {
    it('automatically confirms reported payments that are older than 48 hours', async () => {
      const agreement = await RentalAgreement.create({
        landlordId: landlord.id,
        propertyId: testApartment.id,
        status: 'ACTIVE',
        monthlyRentIls: 5000.00,
        startDate: '2026-07-01',
        endDate: '2027-06-30',
      });

      const row = await LedgerRow.create({
        agreementId: agreement.id,
        period: 'מרץ 2027',
        dueDate: '2027-03-01',
        amount: 5000.00,
        status: 'REPORTED',
      });

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      await row.update({ reportedByTenant: threeDaysAgo });

      await runPaymentAutoConfirm();

      const reloaded = await LedgerRow.findByPk(row.id);
      expect(reloaded.status).toBe('PAID');
      expect(reloaded.confirmedByLandlord).toBeDefined();
      expect(reloaded.notes).toContain('Auto-confirmed after 48h');
    });
  });

  describe('runLedgerOverdue', () => {
    it('marks pending payments past their due date by more than 5 days as OVERDUE', async () => {
      const agreement = await RentalAgreement.create({
        landlordId: landlord.id,
        propertyId: testApartment.id,
        status: 'ACTIVE',
        monthlyRentIls: 5000.00,
        startDate: '2026-07-01',
        endDate: '2027-06-30',
      });

      const pastDue = new Date();
      pastDue.setDate(pastDue.getDate() - 6);
      const pastDueStr = pastDue.toISOString().split('T')[0];

      const row = await LedgerRow.create({
        agreementId: agreement.id,
        period: 'ינואר 2027',
        dueDate: pastDueStr,
        amount: 5000.00,
        status: 'PENDING',
      });

      await runLedgerOverdue();

      const reloaded = await LedgerRow.findByPk(row.id);
      expect(reloaded.status).toBe('OVERDUE');
    });
  });

  describe('runLedgerDueAlerts', () => {
    it('logs due alerts for pending payments due exactly 5 days from now', async () => {
      const agreement = await RentalAgreement.create({
        landlordId: landlord.id,
        propertyId: testApartment.id,
        status: 'ACTIVE',
        monthlyRentIls: 5000.00,
        startDate: '2026-07-01',
        endDate: '2027-06-30',
      });

      const dueIn3Days = new Date();
      dueIn3Days.setDate(dueIn3Days.getDate() + 3);
      const dueDateStr = dueIn3Days.toISOString().split('T')[0];

      await LedgerRow.create({
        agreementId: agreement.id,
        period: 'מאי 2027',
        dueDate: dueDateStr,
        amount: 5000.00,
        status: 'PENDING',
      });

      const logSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

      await runLedgerDueAlerts();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('due in 3 days'));

      logSpy.mockRestore();
    });
  });

  describe('runMaintenanceAlerts', () => {
    it('alerts for stale open maintenance tickets and escalates appropriately', async () => {
      const agreement = await RentalAgreement.create({
        landlordId: landlord.id,
        propertyId: testApartment.id,
        status: 'ACTIVE',
        monthlyRentIls: 5000.00,
        startDate: '2026-07-01',
        endDate: '2027-06-30',
      });

      // Create a stale ticket (created 30 hours ago)
      const staleTicket = await MaintenanceTicket.create({
        agreementId: agreement.id,
        reporterId: tenant.id,
        description: 'Sink leaking',
        status: 'OPEN',
      });
      const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000);
      await sequelize.query('UPDATE maintenance_tickets SET created_at = :date WHERE id = :id', {
        replacements: { date: thirtyHoursAgo, id: staleTicket.id }
      });

      // Create an escalated ticket (created 4 days ago)
      const escalatedTicket = await MaintenanceTicket.create({
        agreementId: agreement.id,
        reporterId: tenant.id,
        description: 'No electricity',
        status: 'OPEN',
      });
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      await sequelize.query('UPDATE maintenance_tickets SET created_at = :date WHERE id = :id', {
        replacements: { date: fourDaysAgo, id: escalatedTicket.id }
      });

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await runMaintenanceAlerts();

      // Should alert on both stale (24h) and escalated (3d) tickets
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('no response'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('still open'));

      logSpy.mockRestore();
    });
  });

  describe('runR2Cleanup', () => {
    it('scans and identifies ended agreements older than 6 months', async () => {
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

      const agreement = await RentalAgreement.create({
        landlordId: landlord.id,
        propertyId: testApartment.id,
        status: 'ENDED',
        monthlyRentIls: 5000.00,
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        r2DocKey: 'contract-docs/mock-file.pdf',
      });
      await sequelize.query('UPDATE rental_agreements SET updated_at = :date WHERE id = :id', {
        replacements: { date: sevenMonthsAgo, id: agreement.id }
      });

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await runR2Cleanup();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(/R2 CLEANUP: Found \d+ ended contracts older than 6 months/)
      );

      logSpy.mockRestore();
    });
  });
});
