const express = require('express');
const { Match, Apartment, User, Message } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const { acceptMatch } = require('../services/matchingService');
const { cacheGet, cacheSet, cacheDel, getRedisClient } = require('../config/redis');
const { sendPushNotification } = require('../services/pushService');

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

    // Attach unread counts from MongoDB (graceful fallback if unavailable)
    let unreadMap = {};
    try {
      const matchIds = matches.map((m) => m.id);
      const unreadAgg = await Message.aggregate([
        { $match: { matchId: { $in: matchIds }, senderId: { $ne: userId }, isRead: false } },
        { $group: { _id: '$matchId', count: { $sum: 1 } } },
      ]);
      unreadMap = Object.fromEntries(unreadAgg.map((u) => [u._id, u.count]));
    } catch { /* MongoDB unavailable — unread counts default to 0 */ }

    const matchesWithUnread = matches.map((m) => ({
      ...m.toJSON(),
      unreadCount: unreadMap[m.id] ?? 0,
    }));

    await cacheSet(cacheKey, matchesWithUnread, 60);
    res.json({ matches: matchesWithUnread });
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

    // Notify the tenant their match was accepted (fire-and-forget)
    getRedisClient().get(`push:token:${match.tenantId}`).then((token) => {
      sendPushNotification(token, {
        title: 'ההתאמה שלך אושרה! 🏠',
        body: 'בעל הדירה מעוניין — ניתן לשלוח הודעה',
        data: { matchId: match.id },
      });
    }).catch(() => {});

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

    // Notify the tenant (fire-and-forget)
    getRedisClient().get(`push:token:${match.tenantId}`).then((token) => {
      sendPushNotification(token, {
        title: 'עדכון על ההתאמה שלך',
        body: 'בעל הדירה לא מעוניין בהתאמה זו',
        data: { type: 'match_rejected' },
      });
    }).catch(() => {});

    res.json({ match });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
