const express = require('express');
const request = require('supertest');

let mockUser = { id: 'tenant-1', role: 'tenant' };
const mockFindById = jest.fn();
const mockFindOneAndUpdate = jest.fn();

jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockUser;
    next();
  },
  requireRole: (...roles) => (req, res, next) => (
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ error: 'Insufficient permissions' })
  ),
}));

jest.mock('../src/models', () => ({
  Match: {},
  Apartment: {},
  User: {},
}));

jest.mock('../src/models/mongo/RentalContract', () => ({
  findById: mockFindById,
  findOneAndUpdate: mockFindOneAndUpdate,
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const contractsRouter = require('../src/routes/contracts');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/contracts', contractsRouter);
  return app;
}

function contract(overrides = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    tenantId: 'tenant-1',
    landlordId: 'landlord-1',
    status: 'pending_tenant',
    tenantSignedAt: null,
    landlordSignedAt: new Date('2026-05-01T00:00:00.000Z'),
    startDate: new Date('2026-06-01T00:00:00.000Z'),
    endDate: new Date('2027-06-01T00:00:00.000Z'),
    monthlyRent: 5000,
    depositAmount: 5000,
    depositMonths: 1,
    customClauses: '',
    apartmentTitle: 'Unit Test Apartment',
    apartmentAddress: '1 Test Street',
    landlordName: 'Land Lord',
    tenantName: 'Ten Ant',
    ...overrides,
  };
}

describe('contract signing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'tenant-1', role: 'tenant' };
  });

  it('signs with a single atomic update that derives active status from both signatures', async () => {
    const updated = contract({
      status: 'active',
      tenantSignedAt: new Date('2026-05-02T00:00:00.000Z'),
    });
    mockFindById.mockResolvedValueOnce(contract());
    mockFindOneAndUpdate.mockResolvedValueOnce(updated);

    const res = await request(makeApp())
      .post('/api/contracts/507f1f77bcf86cd799439011/sign')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.contract.status).toBe('active');
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: '507f1f77bcf86cd799439011',
        tenantId: 'tenant-1',
        tenantSignedAt: null,
        status: { $nin: ['active', 'terminated'] },
      },
      [
        { $set: { tenantSignedAt: expect.any(Date) } },
        { $set: { status: expect.objectContaining({ $cond: expect.any(Array) }) } },
      ],
      { new: true }
    );
  });
});
