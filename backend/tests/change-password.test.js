/**
 * POST /api/auth/change-password integration tests.
 */
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';

jest.mock('../src/config/redis', () => {
  const store = new Map();
  const mockClient = { disconnect: jest.fn() };
  return {
    initRedis: jest.fn().mockResolvedValue(undefined),
    getRedisClient: jest.fn(() => mockClient),
    cacheGet: jest.fn(async (key) => {
      const value = store.get(key);
      return value === undefined ? null : value;
    }),
    cacheSet: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    cacheDel: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const { generateStrongTestPassword } = require('./helpers/testCredentials');

const ORIGINAL_PASSWORD = generateStrongTestPassword();
const NEW_PASSWORD = generateStrongTestPassword();
const WRONG_PASSWORD = generateStrongTestPassword();

const USER = {
  email: `pwchange_${Date.now()}@test.com`,
  password: ORIGINAL_PASSWORD,
  firstName: 'Pw',
  lastName: 'Change',
  role: 'landlord',
};

let token = '';

beforeAll(async () => {
  await Promise.all([
    sequelize.sync({ force: false }),
    initRedis(),
  ]);
  const res = await request(app).post('/api/auth/register').send(USER);
  token = res.body.token;
}, 30_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('POST /api/auth/change-password', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: ORIGINAL_PASSWORD, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(401);
  });

  it('rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: ORIGINAL_PASSWORD });
    expect(res.status).toBe(422);
  });

  it('rejects short new password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: ORIGINAL_PASSWORD, newPassword: 'short' });
    expect(res.status).toBe(422);
  });

  it('rejects wrong current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: WRONG_PASSWORD, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/current password/i);
  });

  it('changes the password and allows login with the new one', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: ORIGINAL_PASSWORD, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: USER.email, password: ORIGINAL_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: USER.email, password: NEW_PASSWORD });
    expect([200, 403]).toContain(newLogin.status); // 403 only if email-verification gate is active
    if (newLogin.status === 403) {
      expect(newLogin.body.code).toBe('EMAIL_NOT_VERIFIED');
    }
  });
});

describe('API 404 fallback', () => {
  it('returns terminal JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/no/such/route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});
