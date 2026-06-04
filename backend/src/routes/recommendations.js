const express = require('express');
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');
const { Apartment, Swipe, User } = require('../models');
const { UserPreferences } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const { geminiSearchLimiter } = require('../middleware/geminiRateLimit');
const { parseSearchQuery } = require('../services/geminiService');
const { scoreApartmentsForUser } = require('../services/aiServiceClient');
const { cacheGet, cacheSet } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/recommendations/search — NLP free-text search via Gemini
router.post(
  '/search',
  authenticate,
  geminiSearchLimiter,
  [body('query').trim().isLength({ min: 2, max: 500 }).withMessage('Query must be 2-500 chars')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const { query, city, maxPrice, minRooms, petsAllowed } = req.body;

      // Cache parsed filters for identical queries (5 min). Bump version when parser semantics change.
      const filterCacheKey = `nlp:v3:${Buffer.from(query).toString('base64').slice(0, 40)}`;
      let filters = await cacheGet(filterCacheKey);

      if (!filters) {
        filters = await parseSearchQuery(query);
        await cacheSet(filterCacheKey, filters, 300);
      }

      // Manual overrides take precedence over NLP-parsed values
      const overrides = {};
      if (city) overrides.city = city;
      if (maxPrice) overrides.maxPrice = parseInt(maxPrice);
      if (minRooms) overrides.minRooms = parseInt(minRooms);
      if (petsAllowed !== undefined) overrides.petsAllowed = Boolean(petsAllowed);
      const mergedFilters = { ...filters, ...overrides };

      // Save to user's NLP search history (fire-and-forget)
      UserPreferences.updateOne(
        { userId: req.user.id },
        {
          $push: {
            nlpSearchHistory: {
              $each: [{ query, parsedFilters: mergedFilters, searchedAt: new Date() }],
              $slice: -50,
            },
          },
        },
        { upsert: true }
      ).catch(() => {});

      // Exclude already-swiped apartments
      const swipedIds = await Swipe.findAll({
        where: { tenantId: req.user.id },
        attributes: ['apartmentId'],
        raw: true,
      }).then((rows) => rows.map((r) => r.apartmentId));

      const baseExclusions = {};
      if (swipedIds.length) baseExclusions.id = { [Op.notIn]: swipedIds };
      baseExclusions.isActive = true;

      // Strict search with all filters (including amenities)
      const strictWhere = { ...buildWhereFromFilters(mergedFilters, req.user.id), ...baseExclusions };
      let apartments = await Apartment.findAll({
        where: strictWhere,
        include: [{ model: User, as: 'landlord', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'isVerified', 'trustScore'] }],
        order: [['likeCount', 'DESC'], ['createdAt', 'DESC']],
        limit: 30,
      });

      // Relaxed fallback: drop amenities + petsAllowed filters when strict search returns nothing
      let relaxed = false;
      if (apartments.length === 0 && (mergedFilters.amenities?.length || mergedFilters.petsAllowed)) {
        const relaxedFilters = { ...mergedFilters };
        delete relaxedFilters.amenities;
        delete relaxedFilters.petsAllowed;
        const relaxedWhere = { ...buildWhereFromFilters(relaxedFilters, req.user.id), ...baseExclusions };
        apartments = await Apartment.findAll({
          where: relaxedWhere,
          include: [{ model: User, as: 'landlord', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'isVerified', 'trustScore'] }],
          order: [['likeCount', 'DESC'], ['createdAt', 'DESC']],
          limit: 30,
        });
        relaxed = apartments.length > 0;
      }

      res.json({ apartments, filters: mergedFilters, total: apartments.length, relaxed });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/recommendations/personalized — preference-based feed
router.get('/personalized', authenticate, requireRole('tenant'), async (req, res, next) => {
  try {
    const tenantId = req.user.id;
    const cacheKey = `rec:personalized:${tenantId}`;

    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    const prefs = await UserPreferences.findOne({ userId: tenantId }).lean();

    // Build filter from stored preferences (falls back to no filter if none saved)
    const where = { isActive: true };

    if (prefs?.cities?.length) {
      where.city = { [Op.iLike]: { [Op.any]: prefs.cities } };
    }
    if (prefs?.budget?.max) {
      where.price = { [Op.lte]: prefs.budget.max };
      if (prefs.budget.min) where.price[Op.gte] = prefs.budget.min;
    }
    if (prefs?.rooms?.min) {
      where.rooms = { [Op.gte]: prefs.rooms.min };
    }
    if (prefs?.requiredAmenities?.length) {
      where.amenities = { [Op.contains]: prefs.requiredAmenities };
    }

    // Exclude swiped apartments
    const swipedIds = (prefs?.swipeHistory || []).map((s) => s.apartmentId);
    if (swipedIds.length) {
      where.id = { [Op.notIn]: swipedIds };
    }

    const apartmentsRaw = await Apartment.findAll({
      where,
      include: [{ model: User, as: 'landlord', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'isVerified', 'trustScore'] }],
      order: [['likeCount', 'DESC'], ['createdAt', 'DESC']],
      limit: 40,
    });

    const apartmentsPlain = apartmentsRaw.map((a) => a.toJSON());
    const ranked = await scoreApartmentsForUser(tenantId, apartmentsPlain);
    const apartments = ranked.length ? ranked.slice(0, 20) : apartmentsPlain.slice(0, 20);

    const payload = { apartments, total: apartments.length };
    await cacheSet(cacheKey, payload, 300);

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// POST /api/recommendations/score — numeric ranking for a tenant (Node default; optional ai-service proxy)
router.post(
  '/score',
  authenticate,
  requireRole('tenant'),
  [body('apartments').isArray({ min: 1 }).withMessage('apartments array is required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }

      const ranked = await scoreApartmentsForUser(req.user.id, req.body.apartments);
      res.json({ apartments: ranked, total: ranked.length });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/recommendations/preferences — fetch current tenant preferences
router.get('/preferences', authenticate, requireRole('tenant'), async (req, res, next) => {
  try {
    const prefs = await UserPreferences.findOne({ userId: req.user.id }).lean();
    res.json({
      preferences: prefs
        ? {
            budget: prefs.budget ?? { min: 0, max: 99999 },
            cities: prefs.cities ?? [],
            rooms: prefs.rooms ?? { min: 1, max: 10 },
            requiredAmenities: prefs.requiredAmenities ?? [],
            petsAllowed: prefs.petsAllowed ?? false,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/recommendations/preferences — save/update tenant preferences
router.post(
  '/preferences',
  authenticate,
  requireRole('tenant'),
  async (req, res, next) => {
    try {
      const { budget, cities, neighborhoods, rooms, requiredAmenities, petsAllowed } = req.body;

      const update = {};
      if (budget) update.budget = budget;
      if (cities) update.cities = cities;
      if (neighborhoods) update.neighborhoods = neighborhoods;
      if (rooms) update.rooms = rooms;
      if (requiredAmenities) update.requiredAmenities = requiredAmenities;
      if (petsAllowed !== undefined) update.petsAllowed = petsAllowed;

      const prefs = await UserPreferences.findOneAndUpdate(
        { userId: req.user.id },
        { $set: update },
        { upsert: true, new: true }
      );

      res.json({ preferences: prefs });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildWhereFromFilters(filters, tenantId) {
  const where = {};

  if (filters.city) where.city = { [Op.iLike]: `%${filters.city}%` };
  const streetFilter = filters.street || filters.neighborhood;
  if (streetFilter) where.street = { [Op.iLike]: `%${streetFilter}%` };

  if (filters.minPrice || filters.maxPrice) {
    where.price = {};
    if (filters.minPrice) where.price[Op.gte] = filters.minPrice;
    if (filters.maxPrice) where.price[Op.lte] = filters.maxPrice;
  }

  if (filters.minRooms || filters.maxRooms) {
    where.rooms = {};
    if (filters.minRooms) where.rooms[Op.gte] = filters.minRooms;
    if (filters.maxRooms) where.rooms[Op.lte] = filters.maxRooms;
  }

  if (filters.amenities?.length) {
    where.amenities = { [Op.contains]: filters.amenities };
  }

  if (filters.petsAllowed === true) {
    where.petsAllowed = true;
  }

  if (filters.availableFrom) {
    where.availableFrom = { [Op.lte]: new Date(filters.availableFrom) };
  }

  return where;
}

module.exports = router;
