const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

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
  [body('successUrl').isURL(), body('failUrl').isURL()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const { successUrl, failUrl } = req.body;

      const transaction = await createMeshulamTransaction({
        amount: 2900,          // ₪29/month in agorot
        description: 'DirApp Premium — גישה מלאה לכל הדירות',
        userId: req.user.id,
        successUrl,
        failUrl,
      });

      res.json({ paymentUrl: transaction.data?.pageUrl, transactionId: transaction.data?.transactionId });
    } catch (err) {
      logger.error('Payment error:', err.message);
      next(err);
    }
  }
);

// POST /api/payments/webhook — Meshulam payment confirmation
router.post('/webhook', async (req, res, next) => {
  try {
    const { transactionId, status, userId } = req.body;

    if (status === 'success' && userId) {
      const { User } = require('../models');
      await User.update({ isPremium: true }, { where: { id: userId } });
      logger.info(`User ${userId} upgraded to premium via transaction ${transactionId}`);
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

module.exports = router;
