process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_identity_hash_route';
delete process.env.IDENTITY_HASH_SECRET;

const crypto = require('crypto');
const request = require('supertest');

const mockIdentityVerification = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

const mockMatch = {
  findOne: jest.fn(),
};

jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (token === 'tenant') {
      req.user = { id: 'tenant-1', role: 'tenant' };
      return next();
    }
    if (token === 'landlord') {
      req.user = { id: 'landlord-1', role: 'landlord' };
      return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
  },
  requireRole: (...roles) => (req, res, next) => (
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ error: 'Insufficient permissions' })
  ),
  requireVerified: (_req, _res, next) => next(),
}));

jest.mock('../src/config/redis', () => ({
  cacheGet: jest.fn(async () => null),
  cacheSet: jest.fn(async () => undefined),
  cacheDel: jest.fn(async () => undefined),
  getRedisClient: () => ({
    get: jest.fn(async () => null),
    setex: jest.fn(async () => 'OK'),
    del: jest.fn(async () => 1),
  }),
}));

jest.mock('../src/config/socket', () => ({
  getIO: () => ({ to: () => ({ emit: () => {} }) }),
}));

jest.mock('../src/services/pushService', () => ({
  sendPushNotification: jest.fn(async () => true),
}));

jest.mock('../src/services/uploadService', () => ({
  upload: {
    array: () => (_req, _res, next) => next(),
    single: () => (_req, _res, next) => next(),
  },
  uploadMany: jest.fn(async () => []),
}));

jest.mock('../src/services/geminiService', () => ({
  generateMarketingCopy: jest.fn(async () => ({ title: 'Title', description: 'Description' })),
  COPY_STYLE_INSTRUCTIONS: {},
  parseSearchQuery: jest.fn(async () => ({})),
}));

jest.mock('../src/models', () => ({
  Apartment: {},
  User: {},
  Swipe: {},
  Match: mockMatch,
  Message: { aggregate: jest.fn(async () => []) },
  UserPreferences: {},
}));

jest.mock('../src/models/mongo/IdentityVerification', () => mockIdentityVerification);

const app = require('../src/app');

function sha256Id(idNumber) {
  return crypto.createHash('sha256').update(idNumber).digest('hex');
}

function hmacId(idNumber) {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(idNumber)
    .digest('hex');
}

describe('Screening identity routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdentityVerification.findOne.mockReset();
    mockIdentityVerification.findOneAndUpdate.mockReset();
    mockMatch.findOne.mockReset();
  });

  it('stores a keyed HMAC instead of a reversible bare SHA-256 ID hash', async () => {
    mockIdentityVerification.findOne.mockResolvedValue(null);
    mockIdentityVerification.findOneAndUpdate.mockResolvedValue({
      status: 'pending',
      idNumberLast4: '6789',
    });

    const res = await request(app)
      .post('/api/screening/identity')
      .set('Authorization', 'Bearer tenant')
      .send({ idNumber: '123456789', fullName: 'Test Tenant', phone: '0501234567' });

    expect(res.status).toBe(202);

    const upsertCall = mockIdentityVerification.findOneAndUpdate.mock.calls.find(
      ([, , options]) => options?.upsert
    );
    const storedHash = upsertCall[1].$set.idNumberHash;

    expect(storedHash).toBe(hmacId('123456789'));
    expect(storedHash).not.toBe(sha256Id('123456789'));
    await new Promise((resolve) => setImmediate(resolve));
  });

  it('checks both current HMAC and legacy SHA-256 hashes before claiming an ID', async () => {
    mockIdentityVerification.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ userId: 'other-tenant' });

    const res = await request(app)
      .post('/api/screening/identity')
      .set('Authorization', 'Bearer tenant')
      .send({ idNumber: '123456789', fullName: 'Test Tenant', phone: '0501234567' });

    expect(res.status).toBe(409);
    expect(mockIdentityVerification.findOneAndUpdate).not.toHaveBeenCalled();

    const duplicateLookup = mockIdentityVerification.findOne.mock.calls[1][0];
    expect(duplicateLookup.idNumberHash.$in).toEqual(
      expect.arrayContaining([hmacId('123456789'), sha256Id('123456789')])
    );
  });

  it('returns a conflict if Mongo rejects a concurrent duplicate ID claim', async () => {
    mockIdentityVerification.findOne.mockResolvedValue(null);
    mockIdentityVerification.findOneAndUpdate.mockRejectedValue(
      Object.assign(new Error('duplicate key'), {
        code: 11000,
        keyPattern: { idNumberHash: 1 },
      })
    );

    const res = await request(app)
      .post('/api/screening/identity')
      .set('Authorization', 'Bearer tenant')
      .send({ idNumber: '123456789', fullName: 'Test Tenant', phone: '0501234567' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('מספר תעודת הזהות כבר רשום במערכת');
  });
});
