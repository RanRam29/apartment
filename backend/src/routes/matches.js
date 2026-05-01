const express = require('express');
const { Match, Apartment, User } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const { acceptMatch } = require('../services/matchingService');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');

const router = express.Router();

// GET /api/matches — list matches for current user (tenant or landlord)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    const cacheKey = `matches:${role}:${userId}`;

    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ matches: cached, fromCache: true });

    const where = role === 'tenant'
      ? { tenantId: userId, status: ['accepted', 'pending'] }
      : { landlordId: userId };

    const matches = await Match.findAll({
      where,
      include: [
        {
          model: Apartment,
          as: 'apartment',
          attributes: ['id', 'title', 'price', 'city', 'neighborhood', 'rooms', 'images'],
        },
        {
          model: User,
          as: role === 'tenant' ? 'landlord' : 'tenant',
          attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'isVerified'],
        },
      ],
      order: [['lastMessageAt', 'DESC NULLS LAST'], ['createdAt', 'DESC']],
    });

    await cacheSet(cacheKey, matches, 60);
    res.json({ matches });
  } catch (err) {
    next(err);
  }
});

// GET /api/matches/:id — single match detail
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;
    const where = role === 'tenant'
      ? { id: req.params.id, tenantId: userId }
      : { id: req.params.id, landlordId: userId };

    const match = await Match.findOne({
      where,
      include: [
        { model: Apartment, as: 'apartment' },
        { model: User, as: 'tenant', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'phone'] },
        { model: User, as: 'landlord', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'phone'] },
      ],
    });

    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json({ match });
  } catch (err) {
    next(err);
  }
});

// POST /api/matches/:id/accept — landlord accepts a pending match
router.post('/:id/accept', authenticate, requireRole('landlord'), async (req, res, next) => {
  try {
    const match = await acceptMatch(req.params.id, req.user.id);
    if (!match) return res.status(404).json({ error: 'Pending match not found' });
    res.json({ match });
  } catch (err) {
    next(err);
  }
});

// POST /api/matches/:id/reject — landlord rejects a pending match
router.post('/:id/reject', authenticate, requireRole('landlord'), async (req, res, next) => {
  try {
    const match = await Match.findOne({
      where: { id: req.params.id, landlordId: req.user.id, status: 'pending' },
    });
    if (!match) return res.status(404).json({ error: 'Pending match not found' });

    await match.update({ status: 'rejected' });
    await cacheDel(`matches:landlord:${req.user.id}`);
    res.json({ match });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
