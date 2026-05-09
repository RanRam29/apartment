const express = require('express');
const request = require('supertest');

const mockFindOneAndUpdate = jest.fn();
const mockUserUpdate = jest.fn();

jest.mock('../src/models/mongo/RentPayment', () => ({
  findOneAndUpdate: mockFindOneAndUpdate,
}));

jest.mock('../src/models', () => ({
  User: { update: mockUserUpdate },
}));

jest.mock('../src/middleware/auth', () => ({
  authenticate: (_req, _res, next) => next(),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const paymentsRouter = require('../src/routes/payments');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', paymentsRouter);
  return app;
}

describe('payments webhook authentication', () => {
  const originalSecret = process.env.PAYMENT_WEBHOOK_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYMENT_WEBHOOK_SECRET = 'unit-secret';
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.PAYMENT_WEBHOOK_SECRET;
    else process.env.PAYMENT_WEBHOOK_SECRET = originalSecret;
  });

  it('rejects webhook mutations when the shared secret is not configured', async () => {
    delete process.env.PAYMENT_WEBHOOK_SECRET;
    delete process.env.MESHULAM_WEBHOOK_SECRET;

    const res = await request(makeApp())
      .post('/api/payments/webhook')
      .send({ status: 'success', rentPaymentId: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(503);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('rejects webhook mutations with an invalid shared secret', async () => {
    const res = await request(makeApp())
      .post('/api/payments/webhook')
      .set('x-payment-webhook-secret', 'wrong-secret')
      .send({ status: 'success', rentPaymentId: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(401);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('marks a rent payment paid only after secret verification', async () => {
    mockFindOneAndUpdate.mockResolvedValueOnce({ _id: '507f1f77bcf86cd799439011' });

    const res = await request(makeApp())
      .post('/api/payments/webhook')
      .set('x-payment-webhook-secret', 'unit-secret')
      .send({
        transactionId: 'txn_123',
        status: 'success',
        rentPaymentId: '507f1f77bcf86cd799439011',
      });

    expect(res.status).toBe(200);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011', status: { $ne: 'paid' } },
      {
        $set: {
          status: 'paid',
          paidAt: expect.any(Date),
          externalTransactionId: 'txn_123',
        },
      },
      { new: true }
    );
  });
});
