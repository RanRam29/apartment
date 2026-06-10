process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';

jest.mock('../src/services/notificationService', () => ({
  notify: jest.fn().mockResolvedValue({ push: null, email: null }),
}));

const { Op } = require('sequelize');
const { runCheckinUnlock } = require('../src/cron/checkinUnlock');
const { notify } = require('../src/services/notificationService');
const { RentalAgreement } = require('../src/models');

describe('checkinUnlock cron', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(RentalAgreement, 'findAll');
    jest.spyOn(RentalAgreement.prototype, 'update').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('unlocks SIGNED agreements starting in 2 days and notifies parties', async () => {
    const target = new Date();
    target.setDate(target.getDate() + 2);
    const targetStr = target.toISOString().split('T')[0];

    const mockAgreement = {
      id: 'agr-1',
      landlordId: 'landlord-1',
      tenantId: 'tenant-1',
      startDate: targetStr,
      update: jest.fn().mockResolvedValue(undefined),
    };

    RentalAgreement.findAll.mockResolvedValue([mockAgreement]);

    const result = await runCheckinUnlock();

    expect(RentalAgreement.findAll).toHaveBeenCalledWith({
      where: {
        status: 'SIGNED',
        startDate: targetStr,
        checkinUnlockedAt: { [Op.is]: null },
      },
    });
    expect(mockAgreement.update).toHaveBeenCalledWith(
      expect.objectContaining({ checkinUnlockedAt: expect.any(Date) })
    );
    expect(notify).toHaveBeenCalledTimes(2);
    expect(result.unlocked).toBe(1);
    expect(result.notified).toBe(2);
  });

  it('returns zero when no agreements match', async () => {
    RentalAgreement.findAll.mockResolvedValue([]);

    const result = await runCheckinUnlock();

    expect(notify).not.toHaveBeenCalled();
    expect(result.unlocked).toBe(0);
  });
});
