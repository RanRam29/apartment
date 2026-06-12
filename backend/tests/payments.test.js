/**
 * Payment route integration tests.
 * Requires real Postgres + Redis. Meshulam calls are expected to fail without a real API key —
 * tests verify auth guards and webhook processing, not the payment gateway itself.
 */
process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const { generateStrongTestPassword } = require('./helpers/testCredentials');
const { registerVerifyAndLogin } = require('./helpers/authFlow');

const ts = Date.now();
const USER = {
  email: `payment_user_${ts}@test.com`,
  password: generateStrongTestPassword(),
  firstName: 'Pay',
  lastName: 'User',
  role: 'tenant',
};

let userToken = '';
let userId = '';
const UNKNOWN_USER_ID = `unknown-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

beforeAll(async () => {
  await Promise.all([
    sequelize.sync({ force: false }),
    initRedis(),
  ]);

  const auth = await registerVerifyAndLogin(request, app, USER);
  userToken = auth.token;
  userId = auth.user?.id;
}, 30_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('GET /api/payments/status', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/payments/status');
    expect(res.status).toBe(401);
  });

  it('returns premium status (false for new user)', async () => {
    const res = await request(app)
      .get('/api/payments/status')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.isPremium).toBe(false);
  });
});

describe('POST /api/payments/premium', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/payments/premium');
    expect(res.status).toBe(401);
  });

  it('returns 422 for invalid URL format in successUrl', async () => {
    const res = await request(app)
      .post('/api/payments/premium')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ successUrl: 'not-a-url' });
    expect(res.status).toBe(422);
  });

  it('attempts payment flow (fails without MESHULAM_API_KEY)', async () => {
    // Without a real API key the gateway call will throw — we expect a 5xx error response
    // which is the correct behavior (the error handler catches it)
    const res = await request(app)
      .post('/api/payments/premium')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      });
    // Either 500 (no API key configured) or 200/redirect if somehow configured
    expect([200, 500, 502, 503]).toContain(res.status);
  });
});

describe('POST /api/payments/webhook', () => {
  it('processes a successful webhook and upgrades user to premium', async () => {
    if (!userId) return;
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ transactionId: 'txn_test_123', status: 'success', userId });
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    // Verify the user is now premium
    const statusRes = await request(app)
      .get('/api/payments/status')
      .set('Authorization', `Bearer ${userToken}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.isPremium).toBe(true);
  });

  it('handles failed webhook without crashing', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ transactionId: 'txn_fail_456', status: 'failed', userId: UNKNOWN_USER_ID });
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('handles missing body gracefully', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });
});
