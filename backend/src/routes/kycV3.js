const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { initiateVerification, handleWebhook, validateIsraeliId } = require('../services/kycServiceV3');

router.post('/initiate', authenticate, async (req, res, next) => {
  try {
    const result = await initiateVerification(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/validate-id', authenticate, async (req, res, next) => {
  try {
    const { idNumber } = req.body;
    if (!idNumber) return res.status(400).json({ error: 'idNumber is required' });
    const valid = validateIsraeliId(idNumber);
    res.json({ valid });
  } catch (err) {
    next(err);
  }
});

// exposed webhook receiver for Persona
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      const signature = req.headers['persona-signature'] || req.headers['x-persona-signature'] || '';
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
      const result = await handleWebhook(rawBody, signature);
      res.json(result);
    } catch (err) {
      if (err.status === 401) return res.status(401).json({ error: err.message });
      next(err);
    }
  }
);

module.exports = router;
