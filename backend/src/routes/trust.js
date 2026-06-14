const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getTrustStatus, TRUST_EVENTS } = require('../services/trustScoreService');
const { User, TrustScoreEvent } = require('../models');

const router = express.Router();

// GET /api/v3/trust/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const role = user.activeRole || 'tenant';
    const status = await getTrustStatus(user.id, role);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// GET /api/v3/trust/simulate?event=X
router.get('/simulate', authenticate, async (req, res, next) => {
  try {
    const { event } = req.query;
    if (!event) {
      return res.status(400).json({ error: 'Missing event query parameter' });
    }

    const eventConfig = TRUST_EVENTS[event];
    if (!eventConfig) {
      return res.status(400).json({ error: `Unknown event: ${event}` });
    }

    const userId = req.user.id;
    const currentScore = req.user.trustScore ?? 50;

    let deltaToApply = eventConfig.delta;
    if (eventConfig.isOnce) {
      const exists = await TrustScoreEvent.count({ where: { userId, eventKey: event } });
      if (exists > 0) {
        deltaToApply = 0;
      }
    } else if (eventConfig.cap !== undefined) {
      const existingSum = await TrustScoreEvent.sum('delta', { where: { userId, eventKey: event } }) || 0;
      if (existingSum >= eventConfig.cap) {
        deltaToApply = 0;
      } else {
        deltaToApply = Math.min(deltaToApply, eventConfig.cap - existingSum);
      }
    } else {
      const existingSum = await TrustScoreEvent.sum('delta', { where: { userId, eventKey: event } }) || 0;
      if (existingSum >= eventConfig.delta) {
        deltaToApply = 0;
      }
    }

    const hypotheticalScore = Math.min(100, Math.max(0, currentScore + deltaToApply));
    res.json({
      currentScore,
      hypotheticalScore,
      delta: hypotheticalScore - currentScore
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
