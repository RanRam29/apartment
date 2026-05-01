const { Match, Swipe, Apartment, User } = require('../models');
const { cacheSet, cacheDel } = require('../config/redis');
const { getIO } = require('../config/socket');
const logger = require('../utils/logger');

/**
 * Called after every "like" swipe.
 * Checks if the landlord has also liked this tenant (via a landlord-side swipe record),
 * or creates a pending match waiting for landlord approval.
 */
async function handleSwipeMatch(tenantId, apartmentId) {
  const apartment = await Apartment.findByPk(apartmentId, {
    attributes: ['id', 'landlordId', 'title', 'images'],
  });
  if (!apartment) return null;

  const { landlordId } = apartment;

  // Avoid duplicate matches
  const existing = await Match.findOne({ where: { tenantId, apartmentId } });
  if (existing) return existing;

  // Check if landlord already swiped right on this tenant
  const landlordLiked = await Swipe.findOne({
    where: { tenantId: landlordId, apartmentId: tenantId, direction: 'like' },
  });

  const now = new Date();
  const match = await Match.create({
    tenantId,
    landlordId,
    apartmentId,
    status: landlordLiked ? 'accepted' : 'pending',
    tenantLikedAt: now,
    landlordLikedAt: landlordLiked ? now : null,
    // Pending matches expire after 7 days if landlord doesn't respond
    expiresAt: landlordLiked ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  if (match.status === 'accepted') {
    await notifyMatch(match, apartment);
  }

  // Invalidate matches cache for both parties
  await Promise.all([
    cacheDel(`matches:tenant:${tenantId}`),
    cacheDel(`matches:landlord:${landlordId}`),
  ]);

  logger.info(`Match created: ${match.id} status=${match.status}`);
  return match;
}

/**
 * Called when a landlord explicitly approves a pending match.
 */
async function acceptMatch(matchId, landlordId) {
  const match = await Match.findOne({
    where: { id: matchId, landlordId, status: 'pending' },
    include: [{ model: Apartment, as: 'apartment', attributes: ['id', 'title', 'images'] }],
  });
  if (!match) return null;

  await match.update({
    status: 'accepted',
    landlordLikedAt: new Date(),
    expiresAt: null,
  });

  await notifyMatch(match, match.apartment);
  await Promise.all([
    cacheDel(`matches:tenant:${match.tenantId}`),
    cacheDel(`matches:landlord:${landlordId}`),
  ]);

  return match;
}

async function notifyMatch(match, apartment) {
  try {
    const io = getIO();
    const payload = {
      matchId: match.id,
      apartmentId: apartment.id,
      apartmentTitle: apartment.title,
      apartmentImage: apartment.images?.[0]?.url || null,
      matchedAt: new Date().toISOString(),
    };
    io.to(`user:${match.tenantId}`).emit('new_match', payload);
    io.to(`user:${match.landlordId}`).emit('new_match', { ...payload, tenantId: match.tenantId });
  } catch {
    // Socket.io may not be initialized in tests
  }
}

module.exports = { handleSwipeMatch, acceptMatch };
