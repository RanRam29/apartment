/**
 * Auth integration tests.
 *
 * Uses real Postgres + Redis (available in CI via service containers).
 * MongoDB operations in the auth route are fire-and-forget for tenant role only —
 * landlord registration has no MongoDB dependency, so these tests stay green
 * even without a running MongoDB.
 */
const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { initRedis } = require('../src/config/redis');
const { initMongoDB } = require('../src/config/mongodb');
const app = require('../src/app');

const LANDLORD = {
  email: `landlord_${Date.now()}@test.com`,
  password: 'Test1234!',
  firstName: 'Test',
  lastName: 'Landlord',
  role: 'landlord',
};

let authToken = '';

beforeAll(async () => {
  await Promise.all([
    sequelize.sync({ force: false }),
    initRedis(),
    initMongoDB(),
  ]);
}, 30_000);

afterAll(async () => {
  // --forceExit in jest handles connection cleanup
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
      .send({ email: 'bad@test.com' });
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
      .send({ email: LANDLORD.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'anything' });
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
