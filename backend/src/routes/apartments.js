const express = require('express');
const { Op } = require('sequelize');
const { body, query, validationResult } = require('express-validator');
const { Apartment, User, Swipe } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload, uploadMany } = require('../services/uploadService');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Validators ───────────────────────────────────────────────────────────────
const createApartmentValidator = [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 chars'),
  body('price').isInt({ min: 100 }).withMessage('Price must be a positive number'),
  body('rooms').isFloat({ min: 1 }).withMessage('Rooms must be at least 1'),
  body('city').trim().notEmpty().withMessage('City is required'),
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
        sizeSqm, city, neighborhood, address,
        latitude, longitude, amenities, availableFrom,
        minLeasePeriod, petsAllowed,
      } = req.body;

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
        neighborhood,
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
      await cacheDel(`feed:${city.toLowerCase()}`);

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
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  async (req, res, next) => {
    try {
      const {
        city, minPrice, maxPrice, rooms,
        page = 1, limit = 20,
      } = req.query;

      const cacheKey = `feed:${req.user.id}:${city || 'all'}:${minPrice || 0}:${maxPrice || 99999}:${rooms || 'all'}:${page}`;
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
        ...(city && { city: { [Op.iLike]: city } }),
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
        include: [{ model: User, as: 'landlord', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'isVerified'] }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset,
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

    await cacheSet(cacheKey, apartment, 600);
    res.json({ apartment });
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

    const allowed = ['title', 'description', 'price', 'isActive', 'availableFrom', 'amenities', 'petsAllowed'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    await apartment.update(updates);
    await cacheDel(`apartment:${apartment.id}`);
    await cacheDel(`feed:${apartment.city.toLowerCase()}`);

    res.json({ apartment });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/apartments/:id — deactivate listing ─────────────────────────
router.delete('/:id', authenticate, requireRole('landlord'), async (req, res, next) => {
  try {
    const apartment = await Apartment.findOne({
      where: { id: req.params.id, landlordId: req.user.id },
    });
    if (!apartment) return res.status(404).json({ error: 'Apartment not found' });

    await apartment.update({ isActive: false });
    await cacheDel(`apartment:${apartment.id}`);

    res.json({ message: 'Apartment deactivated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
