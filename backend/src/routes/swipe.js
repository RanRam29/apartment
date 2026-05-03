const express = require('express');
const { body, validationResult } = require('express-validator');
const { Swipe, Apartment } = require('../models');
const { UserPreferences } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const { handleSwipeMatch } = require('../services/matchingService');
const { cacheGet, cacheSet, getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

const FREE_DAILY_LIMIT = 20;

function dailyQuotaKey(userId) {
  const today = new Date().toISOString().slice(0, 10);
  return `swipes:daily:${userId}:${today}`;
}

async function getDailyUsed(userId) {
  const val = await getRedisClient().get(dailyQuotaKey(userId));
  return parseInt(val || '0');
}

async function incrementDailyUsed(userId) {
  const redis = getRedisClient();
  const key = dailyQuotaKey(userId);
  const newCount = await redis.incr(key);
  if (newCount === 1) {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    await redis.expireat(key, Math.floor(midnight.getTime() / 1000));
  }
  return newCount;
}

const swipeValidator = [
  body('apartmentId').isUUID().withMessage('Invalid apartment ID'),
  body('direction')
    .isIn(['like', 'dislike', 'superlike'])
    .withMessage('Direction must be like, dislike, or superlike'),
  body('seenDurationMs').optional().isInt({ min: 0 }),
];

// GET /api/swipe/quota — daily usage for the current tenant
router.get('/quota', authenticate, requireRole('tenant'), async (req, res, next) => {
  try {
    const isPremium = Boolean(req.user.isPremium);
    const used = await getDailyUsed(req.user.id);
    res.json({
      used,
      limit: isPremium ? null : FREE_DAILY_LIMIT,
      remaining: isPremium ? null : Math.max(0, FREE_DAILY_LIMIT - used),
      isPremium,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/swipe/last — undo the most recent swipe
router.delete('/last', authenticate, requireRole('tenant'), async (req, res, next) => {
  try {
    const lastSwipe = await Swipe.findOne({
      where: { tenantId: req.user.id },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'apartmentId', 'direction'],
    });
    if (!lastSwipe) return res.status(404).json({ error: 'No swipe to undo' });

    if (lastSwipe.direction === 'like' || lastSwipe.direction === 'superlike') {
      Apartment.decrement('likeCount', { where: { id: lastSwipe.apartmentId } }).catch(() => {});
    }

    await lastSwipe.destroy();

    if (!req.user.isPremium) {
      const redis = getRedisClient();
      const key = dailyQuotaKey(req.user.id);
      const current = await getDailyUsed(req.user.id);
      if (current > 0) await redis.decr(key);
    }

    res.json({ apartmentId: lastSwipe.apartmentId });
  } catch (err) {
    next(err);
  }
});

// POST /api/swipe — record a swipe (tenants only)
router.post('/', authenticate, requireRole('tenant'), swipeValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { apartmentId, direction, seenDurationMs } = req.body;
    const tenantId = req.user.id;
    const isPremium = Boolean(req.user.isPremium);

    // Daily quota check for free users
    if (!isPremium) {
      const used = await getDailyUsed(tenantId);
      if (used >= FREE_DAILY_LIMIT) {
        return res.status(429).json({
          error: 'Daily swipe limit reached',
          dailyUsed: used,
          dailyLimit: FREE_DAILY_LIMIT,
          quotaExceeded: true,
        });
      }
    }

    // Verify apartment exists and is active
    const apartment = await Apartment.findOne({
      where: { id: apartmentId, isActive: true },
      attributes: ['id', 'landlordId'],
    });
    if (!apartment) {
      return res.status(404).json({ error: 'Apartment not found or inactive' });
    }

    if (apartment.landlordId === tenantId) {
      return res.status(400).json({ error: 'Cannot swipe on your own listing' });
    }

    const [swipe, created] = await Swipe.upsert({
      tenantId,
      apartmentId,
      direction,
      seenDurationMs: seenDurationMs || null,
    }, { returning: true });

    // Update swipe history in MongoDB (fire-and-forget)
    UserPreferences.updateOne(
      { userId: tenantId },
      {
        $push: {
          swipeHistory: {
            $each: [{ apartmentId, direction, seenDurationMs, swipedAt: new Date() }],
            $slice: -500,
          },
        },
      },
      { upsert: true }
    ).catch((err) => logger.warn('Failed to update swipe history in Mongo:', err.message));

    if (direction === 'like' || direction === 'superlike') {
      Apartment.increment('likeCount', { where: { id: apartmentId } }).catch(() => {});
    }

    let match = null;
    if (direction === 'like' || direction === 'superlike') {
      match = await handleSwipeMatch(tenantId, apartmentId);
    }

    const dailyUsed = isPremium ? null : await incrementDailyUsed(tenantId);

    res.status(created ? 201 : 200).json({
      swipe: { id: swipe.id, direction, apartmentId },
      match: match ? { id: match.id, status: match.status } : null,
      dailyUsed,
      dailyLimit: isPremium ? null : FREE_DAILY_LIMIT,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/swipe/history — tenant's swipe history (last 100)
router.get('/history', authenticate, requireRole('tenant'), async (req, res, next) => {
  try {
    const cacheKey = `swipe:history:${req.user.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ swipes: cached, fromCache: true });

    const swipes = await Swipe.findAll({
      where: { tenantId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 100,
      attributes: ['id', 'apartmentId', 'direction', 'createdAt'],
    });

    await cacheSet(cacheKey, swipes, 120);
    res.json({ swipes });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
