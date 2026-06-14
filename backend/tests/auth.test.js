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

const TEST_PASSWORD = generateStrongTestPassword();
const WRONG_PASSWORD = generateStrongTestPassword();
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
let verificationToken = '';

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
    expect(res.body.verificationRequired).toBe(true);
    expect(typeof res.body.verificationToken).toBe('string');
    authToken = res.body.token;
    verificationToken = res.body.verificationToken;
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

  it('registers successfully when phone is an empty string and sets it to null', async () => {
    const email = `tenant_empty_phone_${Date.now()}@test.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: TEST_PASSWORD,
        firstName: 'Test',
        lastName: 'Tenant',
        role: 'tenant',
        phone: '',
      });

    expect(res.status).toBe(201);
    
    // Check in database that phone is stored as null
    const { User } = require('../src/models');
    const createdUser = await User.findOne({ where: { email } });
    expect(createdUser.phone).toBeNull();
  });

  it('registers successfully and sanitizes phone numbers with dashes/spaces/missing prefixes', async () => {
    const email = `tenant_sanitized_phone_${Date.now()}@test.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: TEST_PASSWORD,
        firstName: 'Test',
        lastName: 'Tenant',
        role: 'tenant',
        phone: '50-123 4567', // Will be sanitized to 0501234567
      });

    expect(res.status).toBe(201);
    
    const { User } = require('../src/models');
    const createdUser = await User.findOne({ where: { email } });
    expect(createdUser.phone).toBe('0501234567');
  });
});

describe('POST /api/auth/login', () => {
  it('blocks login for unverified accounts', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: LANDLORD.email, password: LANDLORD.password });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Please verify your email before logging in');
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    expect(res.body.verificationRequired).toBe(true);
    expect(res.body.resendAvailable).toBe(true);
    expect(res.body.email).toBe(LANDLORD.email);
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

describe('GET /api/auth/verify/:token', () => {
  it('verifies account with valid token', async () => {
    const res = await request(app).get(`/api/auth/verify/${verificationToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Email verified successfully');
  });

  it('returns 400 for invalid token', async () => {
    const res = await request(app).get('/api/auth/verify/not-a-real-token');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/verify/resend', () => {
  it('resends a verification token for an unverified user', async () => {
    const ts = Date.now();
    const unverified = {
      email: `unverified_${ts}@test.com`,
      password: generateStrongTestPassword(),
      firstName: 'Un',
      lastName: 'Verified',
      role: 'tenant',
    };

    const registerRes = await request(app).post('/api/auth/register').send(unverified);
    expect(registerRes.status).toBe(201);

    const resendRes = await request(app)
      .post('/api/auth/verify/resend')
      .send({ email: unverified.email });

    expect(resendRes.status).toBe(200);
    expect(resendRes.body.message).toBe('If the email exists and is unverified, a verification link has been sent');
    expect(typeof resendRes.body.verificationToken).toBe('string');
  });
});

describe('POST /api/auth/login after verification', () => {
  it('returns JWT on valid credentials after email verification', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: LANDLORD.email, password: LANDLORD.password });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.role).toBe('landlord');
    expect(res.body.user.isVerified).toBe(true);
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
