const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { Apartment, Match, Swipe, User } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const { cacheGet, cacheSet } = require('../config/redis');
const { rankLandlordLeads } = require('../services/landlordLeadRanking');

const router = express.Router();

// GET /api/landlord/dashboard — aggregate stats for the landlord
router.get('/dashboard', authenticate, requireRole('landlord'), async (req, res, next) => {
  try {
    const landlordId = req.user.id;
    const cacheKey = `landlord:dashboard:${landlordId}`;

    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    const [apartments, matchStats, recentMatches] = await Promise.all([
      // All listings with per-listing stats
      Apartment.findAll({
        where: { landlordId },
        attributes: ['id', 'title', 'city', 'price', 'rooms', 'images', 'isActive', 'viewCount', 'likeCount', 'createdAt'],
        order: [['createdAt', 'DESC']],
      }),

      // Match counts by status across all landlord listings
      Match.findAll({
        where: { landlordId },
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),

      // 5 most recent pending matches with tenant info
      Match.findAll({
        where: { landlordId, status: 'pending' },
        include: [
          { model: User, as: 'tenant', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
          { model: Apartment, as: 'apartment', attributes: ['id', 'title', 'images'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: 5,
      }),
    ]);

    // Aggregate totals
    const totalViews = apartments.reduce((s, a) => s + (a.viewCount || 0), 0);
    const totalLikes = apartments.reduce((s, a) => s + (a.likeCount || 0), 0);
    const activeListings = apartments.filter((a) => a.isActive).length;

    const matchCounts = matchStats.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, { pending: 0, accepted: 0, rejected: 0, expired: 0 });

    // 30-day swipe trend per listing
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const apartmentIds = apartments.map((a) => a.id);

    const swipeTrend = apartmentIds.length
      ? await Swipe.findAll({
          where: {
            apartmentId: { [Op.in]: apartmentIds },
            createdAt: { [Op.gte]: thirtyDaysAgo },
            direction: { [Op.in]: ['like', 'superlike'] },
          },
          attributes: [
            [fn('DATE', col('created_at')), 'date'],
            [fn('COUNT', col('id')), 'count'],
          ],
          group: [literal("DATE(created_at)")],
          order: [[literal("DATE(created_at)"), 'ASC']],
          raw: true,
        })
      : [];

    const payload = {
      summary: {
        totalListings: apartments.length,
        activeListings,
        totalViews,
        totalLikes,
        conversionRate: totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : '0.0',
        matches: matchCounts,
      },
      listings: apartments,
      recentPendingMatches: recentMatches,
      swipeTrend,
    };

    // Cache for 3 minutes
    await cacheSet(cacheKey, payload, 180);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// GET /api/landlord/leads — all pending matches (leads) with tenant details
router.get('/leads', authenticate, requireRole('landlord'), async (req, res, next) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: leads, count } = await Match.findAndCountAll({
      where: { landlordId: req.user.id, status },
      include: [
        { model: User, as: 'tenant', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'phone', 'email', 'isVerified'] },
        { model: Apartment, as: 'apartment', attributes: ['id', 'title', 'price', 'city', 'images'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    const rankedLeads = await rankLandlordLeads(leads);

    res.json({
      leads: rankedLeads,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
