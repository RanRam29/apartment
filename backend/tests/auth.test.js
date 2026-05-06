/**
 * Auth integration tests.
 *
 * Uses real Postgres + Redis (available in CI via service containers).
 * MongoDB operations in the auth route are fire-and-forget for tenant role only —
 * landlord registration has no MongoDB dependency, so these tests stay green
 * even without a running MongoDB.
 */
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_auth_tests_only';

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const mockRedisClient = {
  disconnect: jest.fn(),
};
jest.mock('../src/config/redis', () => ({
  initRedis: jest.fn(async () => undefined),
  getRedisClient: jest.fn(() => mockRedisClient),
  cacheGet: jest.fn(async () => null),
  cacheSet: jest.fn(async () => undefined),
  cacheDel: jest.fn(async () => undefined),
}));
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const TEST_PASSWORD = `T-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const WRONG_PASSWORD = `W-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const UNKNOWN_EMAIL = `unknown_${Date.now()}@test.com`;
const INVALID_EMAIL = `invalid_${Date.now()}@test.com`;

const LANDLORD = {
  email: `landlord_${Date.now()}@test.com`,
  password: TEST_PASSWORD,
  firstName: 'Test',
  lastName: 'Landlord',
  role: 'landlord',
};

let authToken = '';

beforeAll(async () => {
  await Promise.all([
    sequelize.sync({ force: false }),
    initRedis(),
  ]);
}, 30_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('POST /api/auth/register', () => {
  it('registers a landlord and returns a JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(LANDLORD);

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe(LANDLORD.email);
    expect(res.body.user.role).toBe('landlord');
    expect(res.body.user.passwordHash).toBeUndefined();
    authToken = res.body.token;
  });

  it('rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(LANDLORD);
    expect(res.status).toBe(409);
  });

  it('rejects missing required fields with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: INVALID_EMAIL });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  it('returns JWT on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: LANDLORD.email, password: LANDLORD.password });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.role).toBe('landlord');
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: LANDLORD.email, password: WRONG_PASSWORD });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: UNKNOWN_EMAIL, password: WRONG_PASSWORD });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user when authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(LANDLORD.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not_a_real_token');
    expect(res.status).toBe(401);
  });
});
