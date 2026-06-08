const express = require('express');
const request = require('supertest');

jest.mock('../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback) => callback('transaction')),
  },
}));

jest.mock('../src/models', () => ({
  Apartment: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  User: {},
  Swipe: {
    destroy: jest.fn(),
    findAll: jest.fn(),
  },
  Match: {
    destroy: jest.fn(),
  },
}));

jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'landlord-1', role: 'landlord' };
    next();
  },
  requireRole: (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  },
}));

jest.mock('../src/middleware/geminiRateLimit', () => ({
  geminiMarketingLimiter: (_req, _res, next) => next(),
}));

jest.mock('../src/services/uploadService', () => ({
  upload: {
    array: () => (_req, _res, next) => next(),
  },
  uploadMany: jest.fn(),
}));

jest.mock('../src/config/redis', () => ({
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  cacheDel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/geminiService', () => ({
  generateMarketingCopy: jest.fn(),
  COPY_STYLE_INSTRUCTIONS: {},
}));

jest.mock('../src/services/auditLogService', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/models/mongo/RentalContract', () => ({
  exists: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { sequelize } = require('../src/config/database');
const { Apartment, Swipe, Match } = require('../src/models');
const RentalContract = require('../src/models/mongo/RentalContract');
const { cacheDel } = require('../src/config/redis');
const { logAudit } = require('../src/services/auditLogService');
const apartmentRouter = require('../src/routes/apartments');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/apartments', apartmentRouter);
  app.use((err, _req, res, _next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

describe('DELETE /api/apartments/:id contract guard', () => {
  const app = makeApp();
  const apartment = {
    id: 'apt-1',
    city: 'Tel Aviv',
    destroy: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Apartment.findOne.mockResolvedValue(apartment);
    Swipe.destroy.mockResolvedValue(0);
    Match.destroy.mockResolvedValue(0);
    apartment.destroy.mockResolvedValue(undefined);
    cacheDel.mockResolvedValue(undefined);
    logAudit.mockResolvedValue(undefined);
  });

  it('blocks destructive deletion while any non-terminated contract exists', async () => {
    RentalContract.exists.mockResolvedValue({ _id: 'contract-1' });

    const res = await request(app).delete('/api/apartments/apt-1');

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/contract/i);
    expect(RentalContract.exists).toHaveBeenCalledWith({
      apartmentId: 'apt-1',
      status: { $ne: 'terminated' },
    });
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(Swipe.destroy).not.toHaveBeenCalled();
    expect(Match.destroy).not.toHaveBeenCalled();
    expect(apartment.destroy).not.toHaveBeenCalled();
  });

  it('deletes the apartment when no open contract exists', async () => {
    RentalContract.exists.mockResolvedValue(null);

    const res = await request(app).delete('/api/apartments/apt-1');

    expect(res.status).toBe(200);
    expect(Swipe.destroy).toHaveBeenCalledWith({
      where: { apartmentId: 'apt-1' },
      transaction: 'transaction',
    });
    expect(Match.destroy).toHaveBeenCalledWith({
      where: { apartmentId: 'apt-1' },
      transaction: 'transaction',
    });
    expect(apartment.destroy).toHaveBeenCalledWith({ transaction: 'transaction' });
  });
});
