const request = require('supertest');

jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'landlord-1', role: 'landlord' };
    next();
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
  getRedisClient: jest.fn(),
}));

jest.mock('../src/models', () => ({
  Apartment: {
    findAll: jest.fn(async () => [
      { id: 'apt-1', isActive: true, viewCount: 30, likeCount: 8, createdAt: new Date() },
      { id: 'apt-2', isActive: false, viewCount: 10, likeCount: 3, createdAt: new Date() },
    ]),
  },
  Match: {
    findAll: jest.fn(async () => [{ status: 'pending', count: '2' }]),
    findAndCountAll: jest.fn(async () => ({
      rows: [{ id: 'm1', status: 'pending' }],
      count: 1,
    })),
  },
  Swipe: {
    findAll: jest.fn(async () => [{ date: '2026-05-01', count: '5' }]),
  },
  User: {},
  UserPreferences: {},
  Message: {},
}));

const app = require('../src/app');

describe('Landlord routes', () => {
  it('returns dashboard summary and trend', async () => {
    const res = await request(app)
      .get('/api/landlord/dashboard')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.summary.totalListings).toBe(2);
    expect(res.body.summary.activeListings).toBe(1);
    expect(Array.isArray(res.body.swipeTrend)).toBe(true);
  });

  it('returns paginated leads by status', async () => {
    const res = await request(app)
      .get('/api/landlord/leads?status=pending&page=1&limit=20')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.leads)).toBe(true);
    expect(res.body.total).toBe(1);
  });
});
