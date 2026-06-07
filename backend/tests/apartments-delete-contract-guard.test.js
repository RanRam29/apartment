const express = require('express');
const request = require('supertest');

function buildAppWithMocks({ apartment, activeContract = null, mongoReadyState = 1 } = {}) {
  jest.resetModules();

  const transaction = jest.fn(async (callback) => callback('tx'));
  const swipeDestroy = jest.fn();
  const matchDestroy = jest.fn();
  const apartmentFindOne = jest.fn().mockResolvedValue(apartment);
  const contractFindOne = jest.fn().mockResolvedValue(activeContract);
  const cacheDel = jest.fn();
  const logAudit = jest.fn();

  jest.doMock('../src/config/database', () => ({
    sequelize: { transaction },
  }));
  jest.doMock('../src/models', () => ({
    Apartment: { findOne: apartmentFindOne },
    User: {},
    Swipe: { destroy: swipeDestroy },
    Match: { destroy: matchDestroy },
  }));
  jest.doMock('../src/models/mongo/RentalContract', () => ({
    db: { readyState: mongoReadyState },
    findOne: contractFindOne,
  }));
  jest.doMock('../src/middleware/auth', () => ({
    authenticate: (req, res, next) => {
      req.user = { id: 'landlord-1', role: 'landlord' };
      next();
    },
    requireRole: () => (req, res, next) => next(),
  }));
  jest.doMock('../src/config/redis', () => ({
    cacheGet: jest.fn(),
    cacheSet: jest.fn(),
    cacheDel,
  }));
  jest.doMock('../src/services/uploadService', () => ({
    upload: { array: () => (req, res, next) => next() },
    uploadMany: jest.fn(),
  }));
  jest.doMock('../src/middleware/geminiRateLimit', () => ({
    geminiMarketingLimiter: (req, res, next) => next(),
  }));
  jest.doMock('../src/services/geminiService', () => ({
    generateMarketingCopy: jest.fn(),
    COPY_STYLE_INSTRUCTIONS: {},
  }));
  jest.doMock('../src/services/auditLogService', () => ({ logAudit }));
  jest.doMock('../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }));

  const router = require('../src/routes/apartments');
  const app = express();
  app.use(express.json());
  app.use('/api/apartments', router);

  return {
    app,
    mocks: {
      transaction,
      swipeDestroy,
      matchDestroy,
      apartmentFindOne,
      contractFindOne,
      cacheDel,
      logAudit,
    },
  };
}

describe('DELETE /api/apartments/:id contract guard', () => {
  afterEach(() => {
    jest.dontMock('../src/config/database');
    jest.dontMock('../src/models');
    jest.dontMock('../src/models/mongo/RentalContract');
    jest.dontMock('../src/middleware/auth');
    jest.dontMock('../src/config/redis');
    jest.dontMock('../src/services/uploadService');
    jest.dontMock('../src/middleware/geminiRateLimit');
    jest.dontMock('../src/services/geminiService');
    jest.dontMock('../src/services/auditLogService');
    jest.dontMock('../src/utils/logger');
  });

  it('blocks permanent deletion when a non-terminated rental contract exists', async () => {
    const apartment = {
      id: 'apt-1',
      city: 'Tel Aviv',
      destroy: jest.fn(),
    };
    const { app, mocks } = buildAppWithMocks({
      apartment,
      activeContract: { _id: 'contract-1', status: 'active' },
    });

    const res = await request(app).delete('/api/apartments/apt-1');

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/active rental contract/i);
    expect(mocks.contractFindOne).toHaveBeenCalledWith({
      apartmentId: 'apt-1',
      landlordId: 'landlord-1',
      status: { $nin: ['terminated'] },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.swipeDestroy).not.toHaveBeenCalled();
    expect(mocks.matchDestroy).not.toHaveBeenCalled();
    expect(apartment.destroy).not.toHaveBeenCalled();
  });

  it('permanently deletes when no active contract exists', async () => {
    const apartment = {
      id: 'apt-1',
      city: 'Tel Aviv',
      destroy: jest.fn(),
    };
    const { app, mocks } = buildAppWithMocks({ apartment });

    const res = await request(app).delete('/api/apartments/apt-1');

    expect(res.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.swipeDestroy).toHaveBeenCalledWith({
      where: { apartmentId: 'apt-1' },
      transaction: 'tx',
    });
    expect(mocks.matchDestroy).toHaveBeenCalledWith({
      where: { apartmentId: 'apt-1' },
      transaction: 'tx',
    });
    expect(apartment.destroy).toHaveBeenCalledWith({ transaction: 'tx' });
  });
});
