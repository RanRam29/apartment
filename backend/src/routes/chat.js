const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Message } = require('../models');
const { Match } = require('../models');
const { authenticate } = require('../middleware/auth');
const { getIO } = require('../config/socket');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');

const router = express.Router();

// Verify the requesting user is a participant in this match
async function verifyMatchParticipant(matchId, userId) {
  const match = await Match.findOne({
    where: { id: matchId, status: 'accepted' },
    attributes: ['id', 'tenantId', 'landlordId'],
  });
  if (!match) return null;
  if (match.tenantId !== userId && match.landlordId !== userId) return null;
  return match;
}

// GET /api/chat/:matchId — fetch paginated messages
router.get(
  '/:matchId',
  authenticate,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('before').optional().isISO8601(),
  ],
  async (req, res, next) => {
    try {
      const match = await verifyMatchParticipant(req.params.matchId, req.user.id);
      if (!match) return res.status(404).json({ error: 'Match not found or not accepted' });

      const limit = parseInt(req.query.limit) || 30;
      const before = req.query.before ? new Date(req.query.before) : new Date();

      const messages = await Message.find({
        matchId: req.params.matchId,
        createdAt: { $lt: before },
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Mark unread messages as read (fire-and-forget)
      Message.updateMany(
        { matchId: req.params.matchId, senderId: { $ne: req.user.id }, isRead: false },
        { isRead: true, readAt: new Date() }
      ).catch(() => {});

      res.json({
        messages: messages.reverse(),
        hasMore: messages.length === limit,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/chat/:matchId — send a message (REST fallback, Socket.io is primary)
router.post(
  '/:matchId',
  authenticate,
  [
    body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 chars'),
    body('type').optional().isIn(['text', 'image']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const match = await verifyMatchParticipant(req.params.matchId, req.user.id);
      if (!match) return res.status(404).json({ error: 'Match not found or not accepted' });

      const { content, type = 'text', imageUrl } = req.body;

      const message = await Message.create({
        matchId: req.params.matchId,
        senderId: req.user.id,
        content,
        type,
        imageUrl: imageUrl || null,
      });

      // Update lastMessageAt on the match (fire-and-forget)
      Match.update(
        { lastMessageAt: new Date() },
        { where: { id: req.params.matchId } }
      ).catch(() => {});

      // Invalidate matches cache for both parties
      await Promise.all([
        cacheDel(`matches:tenant:${match.tenantId}`),
        cacheDel(`matches:landlord:${match.landlordId}`),
      ]);

      // Broadcast via Socket.io to the chat room
      try {
        getIO().to(`chat:${req.params.matchId}`).emit('new_message', {
          id: message._id,
          matchId: req.params.matchId,
          senderId: req.user.id,
          content: message.content,
          type: message.type,
          imageUrl: message.imageUrl,
          createdAt: message.createdAt,
        });
      } catch {
        // Socket.io not available — REST response is sufficient
      }

      res.status(201).json({ message });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/chat/:matchId/read — mark all messages as read
router.patch('/:matchId/read', authenticate, async (req, res, next) => {
  try {
    const match = await verifyMatchParticipant(req.params.matchId, req.user.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const result = await Message.updateMany(
      { matchId: req.params.matchId, senderId: { $ne: req.user.id }, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ updated: result.modifiedCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
