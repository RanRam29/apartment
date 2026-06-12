const express = require('express');
const { authenticate } = require('../middleware/auth');
const UserPoints = require('../models/mongo/UserPoints');
const { User } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// Points per action
const ACTION_POINTS = {
  swipe:              1,
  superlike:          3,
  profile_view:       2,
  match:              10,
  first_message:      5,
  identity_verified:  25,
  contract_signed:    50,
};

// Tier tiers → level
function computeLevel(points) {
  if (points >= 1500) return 4;
  if (points >= 500)  return 3;
  if (points >= 100)  return 2;
  return 1;
}

// Returns badges that should be awarded based on points + action
function resolveBadges(existing, newPoints, action) {
  const existingIds = new Set(existing.map((b) => b.id));
  const toAdd = [];

  // Points-threshold badges
  const thresholdBadges = [
    { id: 'explorer', name: 'חוקר',  threshold: 100  },
    { id: 'trusted',  name: 'מהימן', threshold: 500  },
    { id: 'vip',      name: 'VIP',   threshold: 1500 },
  ];
  for (const badge of thresholdBadges) {
    if (newPoints >= badge.threshold && !existingIds.has(badge.id)) {
      toAdd.push({ id: badge.id, name: badge.name, earnedAt: new Date() });
      existingIds.add(badge.id);
    }
  }

  // Action-based badges
  if (action === 'identity_verified' && !existingIds.has('verified')) {
    toAdd.push({ id: 'verified', name: 'מאומת', earnedAt: new Date() });
  }
  if (action === 'contract_signed' && !existingIds.has('deal_maker')) {
    toAdd.push({ id: 'deal_maker', name: 'סוגר עסקאות', earnedAt: new Date() });
  }

  return toAdd;
}

const gamificationService = require('../services/gamificationService');

// GET /api/gamification/me — get own points, level, badges
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = String(req.user.id);
    let doc = await UserPoints.findOne({ userId });
    if (!doc) {
      const startingPoints = 50;
      doc = new UserPoints({
        userId,
        points: startingPoints,
        level: computeLevel(startingPoints),
        badges: [],
        lastActivityAt: null,
      });
      await doc.save();
    }
    res.json({
      userId:         doc.userId,
      points:         doc.points,
      level:          doc.level,
      badges:         doc.badges,
      lastActivityAt: doc.lastActivityAt,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/gamification/award — award points for an action
router.post('/award', authenticate, async (req, res, next) => {
  try {
    const { action } = req.body;

    if (!action || !(action in ACTION_POINTS)) {
      return res.status(400).json({
        error: 'Invalid action',
        validActions: Object.keys(ACTION_POINTS),
      });
    }

    const userId = String(req.user.id);
    const prevDoc = await UserPoints.findOne({ userId });
    const prevPoints = prevDoc ? prevDoc.points : 50;

    const result = await gamificationService.awardPoints(userId, action);

    // Sync is already handled internally by the service, return the result
    res.json({
      userId:         result.userId,
      action,
      pointsEarned:   result.pointsEarned,
      totalPoints:    result.totalPoints,
      previousPoints: prevPoints,
      level:          result.level,
      badges:         result.badges,
      newBadges:      result.newBadges,
      lastActivityAt: result.lastActivityAt,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/gamification/leaderboard — top 10 by points
router.get('/leaderboard', authenticate, async (req, res, next) => {
  try {
    const topDocs = await UserPoints.find({})
      .sort({ points: -1 })
      .limit(10)
      .lean();

    // Fetch user first names from Postgres in one query
    const userIds = topDocs.map((d) => d.userId);
    let userMap = {};
    try {
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'firstName'],
      });
      for (const u of users) {
        userMap[String(u.id)] = u.firstName;
      }
    } catch (err) {
      logger.warn('Leaderboard: could not fetch user names:', err.message);
    }

    const leaderboard = topDocs.map((doc, idx) => ({
      rank:      idx + 1,
      userId:    doc.userId,
      firstName: userMap[doc.userId] || 'משתמש',
      points:    doc.points,
      level:     doc.level,
      badges:    doc.badges,
    }));

    res.json({ leaderboard });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
