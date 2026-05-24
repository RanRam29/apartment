const crypto = require('crypto');
const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const RentPayment = require('../models/mongo/RentPayment');

const router = express.Router();

function verifyWebhookSignature(req) {
  const secret = process.env.WEBHOOK_SECRET;
  const requiresSignature =
    process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

  if (!secret) return !requiresSignature; // unsigned webhooks are only allowed outside production
  const signatureHeader = req.headers['x-webhook-signature'] || req.headers['x-meshulam-signature'];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (!signature) return false;
  const payload = JSON.stringify(req.body);
  if (typeof payload !== 'string') return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

// ─── Meshulam (Israel) ────────────────────────────────────────────────────────
const MESHULAM_API = 'https://sandbox.meshulam.co.il/api/v1';

async function createMeshulamTransaction({ amount, description, userId, successUrl, failUrl }) {
  const apiKey = process.env.MESHULAM_API_KEY;
  if (!apiKey) throw new Error('MESHULAM_API_KEY not configured');

  const res = await axios.post(
    `${MESHULAM_API}/transaction/create`,
    { apiKey, amount, description, successUrl, failUrl, userId },
    { timeout: 10000 }
  );
  return res.data;
}

// POST /api/payments/premium — upgrade user to premium
router.post(
  '/premium',
  authenticate,
  [
    body('successUrl').optional().isURL(),
    body('failUrl').optional().isURL(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const successUrl = req.body.successUrl || 'dirapp://payment/success';
      const failUrl = req.body.failUrl || 'dirapp://payment/fail';

      const transaction = await createMeshulamTransaction({
        amount: 2900,          // ₪29/month in agorot
        description: 'DirApp Premium — גישה מלאה לכל הדירות',
        userId: req.user.id,
        successUrl,
        failUrl,
      });

      res.json({ paymentUrl: transaction.data?.pageUrl, transactionId: transaction.data?.transactionId });
    } catch (err) {
      logger.error(`Payment error: ${err?.message || err}`);
      next(err);
    }
  }
);

// POST /api/payments/webhook — Meshulam / Bit / PayBox payment confirmation
router.post('/webhook', async (req, res, next) => {
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  try {
    const { transactionId, status, userId, rentPaymentId } = req.body;

    if (status === 'success') {
      if (rentPaymentId) {
        // Rent payment webhook
        const payment = await RentPayment.findById(rentPaymentId);
        if (payment && payment.status !== 'paid') {
          payment.status = 'paid';
          payment.paidAt = new Date();
          payment.externalTransactionId = transactionId;
          await payment.save();
          logger.info(`Rent payment ${rentPaymentId} marked paid via webhook ${transactionId}`);
        }
      } else if (userId) {
        // Premium upgrade webhook
        const { User } = require('../models');
        await User.update({ isPremium: true }, { where: { id: userId } });
        logger.info(`User ${userId} upgraded to premium via transaction ${transactionId}`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/status — check premium status
router.get('/status', authenticate, async (req, res) => {
  const { User } = require('../models');
  const user = await User.findByPk(req.user.id, { attributes: ['isPremium'] });
  res.json({ isPremium: user?.isPremium ?? false });
});

// ─── Rent Collection (F11) ───────────────────────────────────────────────────

function buildBitLink({ amount, description, phone }) {
  const base = 'https://www.bitpay.co.il/';
  const params = new URLSearchParams({ amount: String(amount), description });
  if (phone) params.set('phone', phone.replace(/\D/g, ''));
  return `${base}?${params.toString()}`;
}

function buildPayboxLink({ amount, description }) {
  return `https://payboxapp.page.link/?amount=${amount}&description=${encodeURIComponent(description)}`;
}

// POST /api/payments/rent — landlord creates monthly payment request
router.post(
  '/rent',
  authenticate,
  [
    body('contractId').notEmpty(),
    body('month').matches(/^\d{4}-\d{2}$/),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
      if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Landlords only' });

      const RentalContract = require('../models/mongo/RentalContract');
      const { User } = require('../models');
      const { contractId, month } = req.body;

      const contract = await RentalContract.findById(contractId);
      if (!contract) return res.status(404).json({ error: 'Contract not found' });
      if (String(contract.landlordId) !== String(req.user.id))
        return res.status(403).json({ error: 'Not your contract' });
      if (contract.status !== 'active')
        return res.status(409).json({ error: 'Contract must be active to request rent' });

      const landlord = await User.findByPk(req.user.id, { attributes: ['phone'] });
      const [year, mon] = month.split('-').map(Number);
      const dueDate = new Date(year, mon - 1, 1);

      const payment = await RentPayment.create({
        contractId,
        apartmentId: contract.apartmentId,
        tenantId:    contract.tenantId,
        landlordId:  contract.landlordId,
        amount:      contract.monthlyRent,
        month,
        dueDate,
        apartmentTitle: contract.apartmentTitle,
        landlordPhone:  landlord?.phone || null,
      });

      res.status(201).json({ payment });
    } catch (err) {
      if (err.code === 11000)
        return res.status(409).json({ error: 'Payment for this month already exists' });
      next(err);
    }
  }
);

// GET /api/payments/rent — list rent payments (role-filtered)
router.get('/rent', authenticate, async (req, res, next) => {
  try {
    const filter = req.user.role === 'landlord'
      ? { landlordId: req.user.id }
      : { tenantId:   req.user.id };
    const payments = await RentPayment.find(filter).sort({ dueDate: -1 }).limit(60);
    res.json({ payments });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/rent/:id/pay — tenant initiates Bit / PayBox payment
router.post(
  '/rent/:id/pay',
  authenticate,
  [body('method').optional().isIn(['bit', 'paybox'])],
  async (req, res, next) => {
    try {
      const payment = await RentPayment.findById(req.params.id);
      if (!payment) return res.status(404).json({ error: 'Payment not found' });
      if (String(payment.tenantId) !== String(req.user.id))
        return res.status(403).json({ error: 'Not your payment' });
      if (payment.status === 'paid') return res.status(409).json({ error: 'Already paid' });

      const method = req.body.method || 'bit';
      const description = `שכירות ${payment.apartmentTitle || ''} ${payment.month}`.trim();
      const paymentUrl = method === 'bit'
        ? buildBitLink({ amount: payment.amount, description, phone: payment.landlordPhone })
        : buildPayboxLink({ amount: payment.amount, description });

      payment.status = 'initiated';
      payment.paymentMethod = method;
      await payment.save();

      res.json({ paymentUrl, paymentId: payment._id });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/payments/rent/:id/mark-paid — landlord manually confirms receipt
router.post('/rent/:id/mark-paid', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Landlords only' });
    const payment = await RentPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (String(payment.landlordId) !== String(req.user.id))
      return res.status(403).json({ error: 'Not your payment' });
    if (payment.status === 'paid') return res.status(409).json({ error: 'Already marked as paid' });

    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.paymentMethod = req.body.method || 'bank_transfer';
    await payment.save();

    res.json({ payment });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
