const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const paymentsRouter = require('../src/routes/payments');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', paymentsRouter);
  return app;
}

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

describe('payment webhook signature enforcement', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalWebhookSecret = process.env.WEBHOOK_SECRET;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalWebhookSecret === undefined) {
      delete process.env.WEBHOOK_SECRET;
    } else {
      process.env.WEBHOOK_SECRET = originalWebhookSecret;
    }
  });

  it('rejects unsigned production webhooks when WEBHOOK_SECRET is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WEBHOOK_SECRET;

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .send({ transactionId: 'txn_unsigned', status: 'failed', userId: 'user-123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid webhook signature');
  });

  it('accepts a production webhook with a valid signature', async () => {
    process.env.NODE_ENV = 'production';
    process.env.WEBHOOK_SECRET = 'test_webhook_secret_at_least_20_chars';
    const payload = { transactionId: 'txn_signed', status: 'failed', userId: 'user-123' };

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set('x-webhook-signature', signPayload(payload, process.env.WEBHOOK_SECRET))
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });
});
