const UserPoints = require('../models/mongo/UserPoints');
const { User } = require('../models');
const logger = require('../utils/logger');

const ACTION_POINTS = {
  swipe:              1,
  superlike:          3,
  profile_view:       2,
  match:              10,
  first_message:      5,
  identity_verified:  25,
  contract_signed:    50,
};

function computeLevel(points) {
  if (points >= 1500) return 4;
  if (points >= 500)  return 3;
  if (points >= 100)  return 2;
  return 1;
}

function resolveBadges(existing, newPoints, action) {
  const existingIds = new Set((existing || []).map((b) => b.id));
  const toAdd = [];

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

  if (action === 'identity_verified' && !existingIds.has('verified')) {
    toAdd.push({ id: 'verified', name: 'מאומת', earnedAt: new Date() });
  }
  if (action === 'contract_signed' && !existingIds.has('deal_maker')) {
    toAdd.push({ id: 'deal_maker', name: 'סוגר עסקאות', earnedAt: new Date() });
  }

  return toAdd;
}

async function awardPoints(userId, action) {
  if (!action || !(action in ACTION_POINTS)) {
    throw new Error(`Invalid action: ${action}`);
  }

  const earned = ACTION_POINTS[action];

  // Find or create the points document in MongoDB
  let doc = await UserPoints.findOne({ userId: String(userId) });
  if (!doc) {
    // Look up starting trustScore in PostgreSQL User table
    const user = await User.findByPk(userId, { attributes: ['trustScore'] });
    const startingPoints = user ? (user.trustScore ?? 50) : 50;
    doc = new UserPoints({
      userId: String(userId),
      points: startingPoints,
      level: computeLevel(startingPoints),
      badges: [],
      lastActivityAt: null,
    });
  }

  doc.points += earned;
  doc.level = computeLevel(doc.points);
  doc.lastActivityAt = new Date();

  const newBadges = resolveBadges(doc.badges, doc.points, action);
  if (newBadges.length > 0) {
    doc.badges.push(...newBadges);
  }

  await doc.save();

  logger.info(`Gamification: user=${userId} action=${action} +${earned}pts total=${doc.points} level=${doc.level}`);

  // Sync back to PostgreSQL users table
  User.update({ trustScore: doc.points }, { where: { id: userId } }).catch((err) => {
    logger.warn(`Failed to sync trustScore to Postgres user=${userId}: ${err.message}`);
  });

  return {
    userId: doc.userId,
    action,
    pointsEarned: earned,
    totalPoints: doc.points,
    level: doc.level,
    badges: doc.badges,
    newBadges,
    lastActivityAt: doc.lastActivityAt,
  };
}

module.exports = {
  ACTION_POINTS,
  computeLevel,
  resolveBadges,
  awardPoints,
};
