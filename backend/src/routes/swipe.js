const express = require('express');
const { body, validationResult } = require('express-validator');
const { Swipe, Apartment } = require('../models');
const { UserPreferences } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const { handleSwipeMatch } = require('../services/matchingService');
const { cacheGet, cacheSet } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

const swipeValidator = [
  body('apartmentId').isUUID().withMessage('Invalid apartment ID'),
  body('direction')
    .isIn(['like', 'dislike', 'superlike'])
    .withMessage('Direction must be like, dislike, or superlike'),
  body('seenDurationMs').optional().isInt({ min: 0 }),
];

// POST /api/swipe — record a swipe (tenants only)
router.post('/', authenticate, requireRole('tenant'), swipeValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { apartmentId, direction, seenDurationMs } = req.body;
    const tenantId = req.user.id;

    // Verify apartment exists and is active
    const apartment = await Apartment.findOne({
      where: { id: apartmentId, isActive: true },
      attributes: ['id', 'landlordId'],
    });
    if (!apartment) {
      return res.status(404).json({ error: 'Apartment not found or inactive' });
    }

    // Prevent swiping on own listing
    if (apartment.landlordId === tenantId) {
      return res.status(400).json({ error: 'Cannot swipe on your own listing' });
    }

    // Upsert — allow changing a dislike to a like
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
            $slice: -500, // keep last 500 swipes
          },
        },
      },
      { upsert: true }
    ).catch((err) => logger.warn('Failed to update swipe history in Mongo:', err.message));

    // Increment likeCount on apartment (fire-and-forget)
    if (direction === 'like' || direction === 'superlike') {
      Apartment.increment('likeCount', { where: { id: apartmentId } }).catch(() => {});
    }

    let match = null;
    if (direction === 'like' || direction === 'superlike') {
      match = await handleSwipeMatch(tenantId, apartmentId);
    }

    res.status(created ? 201 : 200).json({
      swipe: { id: swipe.id, direction, apartmentId },
      match: match ? { id: match.id, status: match.status } : null,
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
