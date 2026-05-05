const request = require('supertest');

jest.mock('../src/models', () => ({
  User: {
    update: jest.fn(),
  },
}));

const app = require('../src/app');
const { User } = require('../src/models');

const webhookPayload = {
  transactionId: 'tx_123',
  status: 'success',
  userId: '00000000-0000-4000-8000-000000000001',
};

describe('POST /api/payments/webhook', () => {
  const originalWebhookKey = process.env.MESHULAM_WEBHOOK_KEY;

  beforeEach(() => {
    User.update.mockReset();
    delete process.env.MESHULAM_WEBHOOK_KEY;
  });

  afterAll(() => {
    if (originalWebhookKey === undefined) {
      delete process.env.MESHULAM_WEBHOOK_KEY;
    } else {
      process.env.MESHULAM_WEBHOOK_KEY = originalWebhookKey;
    }
  });

  it('rejects forged premium upgrades when webhook key is not configured', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send(webhookPayload);

    expect(res.status).toBe(503);
    expect(User.update).not.toHaveBeenCalled();
  });

  it('rejects forged premium upgrades with an invalid webhook key', async () => {
    process.env.MESHULAM_WEBHOOK_KEY = 'expected-key';

    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ ...webhookPayload, webhookKey: 'wrong-key' });

    expect(res.status).toBe(401);
    expect(User.update).not.toHaveBeenCalled();
  });

  it('upgrades premium only when Meshulam webhook key matches', async () => {
    process.env.MESHULAM_WEBHOOK_KEY = 'expected-key';

    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ ...webhookPayload, webhookKey: 'expected-key' });

    expect(res.status).toBe(200);
    expect(User.update).toHaveBeenCalledWith(
      { isPremium: true },
      { where: { id: webhookPayload.userId } }
    );
  });
});
