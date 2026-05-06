const request = require('supertest');

jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'user-1', role: 'tenant' };
    next();
  },
  requireRole: (...roles) => (req, res, next) => (
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ error: 'Insufficient permissions' })
  ),
  requireVerified: (_req, _res, next) => next(),
}));

jest.mock('axios', () => ({
  post: jest.fn(),
}));

jest.mock('../src/models', () => ({
  User: {
    update: jest.fn(async () => [1]),
    findByPk: jest.fn(async () => ({ isPremium: true })),
  },
}));

const axios = require('axios');
const app = require('../src/app');
const { User } = require('../src/models');
const TEST_MESHULAM_KEY = `key-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TEST_TRANSACTION_ID = `trx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TEST_USER_ID = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('Payments routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MESHULAM_API_KEY = TEST_MESHULAM_KEY;
  });

  it('creates premium transaction link', async () => {
    axios.post.mockResolvedValue({
      data: {
        data: {
          pageUrl: 'https://meshulam.test/pay/123',
          transactionId: 'trx-123',
        },
      },
    });

    const res = await request(app)
      .post('/api/payments/premium')
      .set('Authorization', 'Bearer token')
      .send({ successUrl: 'https://ok.test', failUrl: 'https://fail.test' });

    expect(res.status).toBe(200);
    expect(res.body.paymentUrl).toBe('https://meshulam.test/pay/123');
    expect(res.body.transactionId).toBe('trx-123');
  });

  it('rejects invalid success URL with 422', async () => {
    const res = await request(app)
      .post('/api/payments/premium')
      .set('Authorization', 'Bearer token')
      .send({ successUrl: 'not-a-url' });

    expect(res.status).toBe(422);
  });

  it('handles webhook and upgrades user on success', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ transactionId: TEST_TRANSACTION_ID, status: 'success', userId: TEST_USER_ID });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(User.update).toHaveBeenCalledWith({ isPremium: true }, { where: { id: TEST_USER_ID } });
  });

  it('returns current premium status', async () => {
    const res = await request(app)
      .get('/api/payments/status')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.isPremium).toBe(true);
  });
});
