const express = require('express');
const { Op } = require('sequelize');
const { body, query, validationResult } = require('express-validator');
const { sequelize } = require('../config/database');
const { Apartment, User, Swipe, Match } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const { geminiMarketingLimiter } = require('../middleware/geminiRateLimit');
const { upload, uploadMany } = require('../services/uploadService');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { generateMarketingCopy, COPY_STYLE_INSTRUCTIONS } = require('../services/geminiService');
const logger = require('../utils/logger');

const router = express.Router();

// ─── F4: True Monthly Cost Calculator ────────────────────────────────────────
// Monthly arnona rate in ₪/m² by city (approximate municipal tax).
const ARNONA_RATE_BY_CITY = {
  'תל אביב': 8, 'tel aviv': 8, 'תל אביב-יפו': 8,
  'ירושלים': 6, 'jerusalem': 6,
  'חיפה': 5, 'haifa': 5,
  'רמת גן': 6, 'ramat gan': 6,
  'בני ברק': 5, 'bnei brak': 5,
  'פתח תקווה': 4.5, 'petah tikva': 4.5,
  'נתניה': 4.5, 'netanya': 4.5,
  'ראשון לציון': 4.5, 'rishon lezion': 4.5,
  'אשדוד': 4, 'ashdod': 4,
  'באר שבע': 3.5, 'beer sheva': 3.5,
};
const DEFAULT_ARNONA_RATE = 4.5; // ₪/m²/month

function computeCostBreakdown(apartment) {
  const rent = Number(apartment.price) || 0;
  const cityKey = (apartment.city || '').toLowerCase().trim();
  const arnonaRate = ARNONA_RATE_BY_CITY[apartment.city] ?? ARNONA_RATE_BY_CITY[cityKey] ?? DEFAULT_ARNONA_RATE;

  // Use sizeSqm if available; otherwise estimate from room count (avg 30 m²/room)
  const sqm = apartment.sizeSqm ? Number(apartment.sizeSqm) : Math.round((Number(apartment.rooms) || 3) * 30);
  const arnonaEstimate = Math.round(arnonaRate * sqm);

  // Building (va'ad bayit) fee by size
  const rooms = Number(apartment.rooms) || 3;
  const buildingFeeEstimate = rooms <= 2 ? 150 : rooms <= 3.5 ? 250 : 400;

  return {
    rent,
    arnonaEstimate,
    buildingFeeEstimate,
    total: rent + arnonaEstimate + buildingFeeEstimate,
    note: 'ארנונה ודמי ועד בית הינם הערכה בלבד',
  };
}

// ─── Validators ───────────────────────────────────────────────────────────────
const createApartmentValidator = [
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 chars'),
  body('price').isInt({ min: 100 }).withMessage('Price must be a positive number'),
  body('rooms').isFloat({ min: 1 }).withMessage('Rooms must be at least 1'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('street')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Street must be 1-100 chars'),
];

// ─── POST /api/apartments — create listing (landlords only) ──────────────────
router.post(
  '/',
  authenticate,
  requireRole('landlord'),
  upload.array('images', 10),
  createApartmentValidator,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }

      const {
        title, description, price, rooms, floor, totalFloors,
        sizeSqm, city, neighborhood, street, address,
        latitude, longitude, amenities, availableFrom,
        minLeasePeriod, petsAllowed,
      } = req.body;
      if (typeof city !== 'string') {
        return res.status(422).json({ error: 'city must be a string' });
      }

      let images = [];
      if (req.files?.length) {
        images = await uploadMany(req.files, 'apartments');
      }

      const apartment = await Apartment.create({
        landlordId: req.user.id,
        title,
        description,
        price: parseInt(price),
        rooms: parseFloat(rooms),
        floor: floor ? parseInt(floor) : null,
        totalFloors: totalFloors ? parseInt(totalFloors) : null,
        sizeSqm: sizeSqm ? parseInt(sizeSqm) : null,
        city,
        street: street || neighborhood || null,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        images,
        amenities: amenities ? JSON.parse(amenities) : [],
        availableFrom: availableFrom || null,
        minLeasePeriod: minLeasePeriod ? parseInt(minLeasePeriod) : null,
        petsAllowed: petsAllowed === 'true',
      });

      // Invalidate feed cache for this city
      const normalizedCity = typeof city === 'string' ? city.toLowerCase() : null;
      if (normalizedCity) {
        await cacheDel(`feed:${normalizedCity}`);
      }
      // Invalidate landlord dashboard cache so listings appear immediately
      await cacheDel(`landlord:dashboard:${req.user.id}`);

      logger.info(`Apartment created: ${apartment.id} by landlord ${req.user.id}`);
      res.status(201).json({ apartment });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/apartments/feed — swipe feed (tenants only) ────────────────────
router.get(
  '/feed',
  authenticate,
  requireRole('tenant'),
  [
    query('city').optional().trim(),
    query('minPrice').optional().isInt({ min: 0 }),
    query('maxPrice').optional().isInt({ min: 0 }),
    query('rooms').optional().isFloat({ min: 1 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 150 }),
  ],
  async (req, res, next) => {
    try {
      const {
        city, minPrice, maxPrice, rooms,
        page = 1, limit = 20,
      } = req.query;

      const cacheKey = `feed:v2:${req.user.id}:${city || 'all'}:${minPrice || 0}:${maxPrice || 99999}:${rooms || 'all'}:${page}`;
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return res.json({ ...cached, fromCache: true });
      }

      // Exclude apartments this user already swiped
      const swipedIds = await Swipe.findAll({
        where: { tenantId: req.user.id },
        attributes: ['apartmentId'],
        raw: true,
      }).then((rows) => rows.map((r) => r.apartmentId));

      const where = {
        isActive: true,
        ...(swipedIds.length && { id: { [Op.notIn]: swipedIds } }),
        ...(typeof city === 'string' && city && { city: { [Op.iLike]: city } }),
        ...(minPrice && { price: { [Op.gte]: parseInt(minPrice) } }),
        ...(maxPrice && {
          price: { [Op.lte]: parseInt(maxPrice) },
          ...(minPrice && { price: { [Op.between]: [parseInt(minPrice), parseInt(maxPrice)] } }),
        }),
        ...(rooms && { rooms: parseFloat(rooms) }),
      };

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { rows: apartments, count } = await Apartment.findAndCountAll({
        where,
        include: [{
          model: User,
          as: 'landlord',
          attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'isVerified', 'isPremium'],
        }],
        // פרימיום (משלם) קודם — מודגש במפה ובפיד
        order: [
          [{ model: User, as: 'landlord' }, 'isPremium', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        limit: parseInt(limit),
        offset,
        distinct: true,
        subQuery: false,
      });

      const payload = {
        apartments,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
      };

      // Cache for 5 minutes
      await cacheSet(cacheKey, payload, 300);

      res.json(payload);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/apartments/:id — single apartment ───────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const cacheKey = `apartment:${req.params.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ apartment: cached, fromCache: true });

    const apartment = await Apartment.findByPk(req.params.id, {
      include: [{ model: User, as: 'landlord', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'isVerified'] }],
    });

    if (!apartment) return res.status(404).json({ error: 'Apartment not found' });

    // Increment view count (fire-and-forget)
    apartment.increment('viewCount').catch(() => {});

    const payload = { ...apartment.toJSON(), costBreakdown: computeCostBreakdown(apartment) };
    await cacheSet(cacheKey, payload, 600);
    res.json({ apartment: payload });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/apartments/:id — update listing (landlord owner only) ─────────
router.patch('/:id', authenticate, requireRole('landlord'), async (req, res, next) => {
  try {
    const apartment = await Apartment.findOne({
      where: { id: req.params.id, landlordId: req.user.id },
    });
    if (!apartment) return res.status(404).json({ error: 'Apartment not found' });

    const allowed = [
      'title', 'description', 'price', 'rooms', 'floor', 'totalFloors',
      'sizeSqm', 'city', 'street', 'neighborhood', 'address', 'amenities',
      'petsAllowed', 'availableFrom', 'minLeasePeriod', 'isActive',
    ];
    const raw = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    const updates = {};
    for (const [k, v] of Object.entries(raw)) {
      if (['price', 'floor', 'totalFloors', 'sizeSqm', 'minLeasePeriod'].includes(k)) {
        updates[k] = v !== '' && v !== null ? parseInt(v, 10) : null;
      } else if (k === 'rooms') {
        updates[k] = parseFloat(v);
      } else if (k === 'petsAllowed' || k === 'isActive') {
        updates[k] = v === true || v === 'true';
      } else {
        updates[k] = v;
      }
    }

    await apartment.update(updates);
    await cacheDel(`apartment:${apartment.id}`);
    const normalizedCity = typeof apartment.city === 'string' ? apartment.city.toLowerCase() : null;
    if (normalizedCity) {
      await cacheDel(`feed:${normalizedCity}`);
    }
    await cacheDel(`landlord:dashboard:${req.user.id}`);

    res.json({ apartment });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/apartments/:id — permanently delete listing (owner only) ───
router.delete('/:id', authenticate, requireRole('landlord'), async (req, res, next) => {
  try {
    const apartment = await Apartment.findOne({
      where: { id: req.params.id, landlordId: req.user.id },
    });
    if (!apartment) return res.status(404).json({ error: 'Apartment not found' });

    const normalizedCity = typeof apartment.city === 'string' ? apartment.city.toLowerCase() : null;
    const aid = apartment.id;

    await sequelize.transaction(async (t) => {
      await Swipe.destroy({ where: { apartmentId: aid }, transaction: t });
      await Match.destroy({ where: { apartmentId: aid }, transaction: t });
      await apartment.destroy({ transaction: t });
    });

    await cacheDel(`apartment:${aid}`);
    await cacheDel(`landlord:dashboard:${req.user.id}`);
    if (normalizedCity) {
      await cacheDel(`feed:${normalizedCity}`);
    }

    res.json({ message: 'Apartment deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── F7: GenAI Marketing Copy Generator ──────────────────────────────────────
// POST /api/apartments/:id/marketing-copy — generate style-variant copy (landlord owner only)
router.post(
  '/:id/marketing-copy',
  authenticate,
  requireRole('landlord'),
  geminiMarketingLimiter,
  [body('style').optional().isIn(['professional', 'friendly', 'luxury'])],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const style = req.body.style || 'professional';

      const apartment = await Apartment.findOne({
        where: { id: req.params.id, landlordId: req.user.id },
      });
      if (!apartment) return res.status(404).json({ error: 'Apartment not found' });

      const cacheKey = `marketing-copy:${apartment.id}:${style}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return res.json({ copy: cached, style, fromCache: true });

      const copy = await generateMarketingCopy(apartment, style);
      if (!copy) return res.status(503).json({ error: 'AI service unavailable — set GEMINI_API_KEY' });

      await cacheSet(cacheKey, copy, 600);
      res.json({ copy, style });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
