const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const ServiceListing = require('../models/mongo/ServiceListing');
const ServiceReview  = require('../models/mongo/ServiceReview');

const router = express.Router();

// GET /api/services — list active services; query: ?category=&city=&page=
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { category, city, page = 1 } = req.query;
    const filter = { isActive: true };
    if (category && category !== 'all') filter.category = category;
    if (city) filter.cities = city;

    const limit  = 20;
    const skip   = (Number(page) - 1) * limit;
    const [services, total] = await Promise.all([
      ServiceListing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ServiceListing.countDocuments(filter),
    ]);

    res.json({ services, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// POST /api/services — create service listing (any authenticated user)
router.post(
  '/',
  authenticate,
  [
    body('category').isIn(['movers', 'cleaning', 'painting', 'plumbing', 'electricity', 'carpentry', 'other']),
    body('title').notEmpty().trim(),
    body('priceType').optional().isIn(['hourly', 'fixed', 'quote']),
    body('price').optional({ nullable: true }).isFloat({ min: 0 }),
    body('phone').optional().trim(),
    body('description').optional().trim(),
    body('cities').optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const { User } = require('../models');
      const user = await User.findByPk(req.user.id, { attributes: ['firstName', 'lastName'] });
      const providerName = user ? `${user.firstName} ${user.lastName}` : null;

      const service = await ServiceListing.create({
        ...req.body,
        providerId:   req.user.id,
        providerName,
      });

      res.status(201).json({ service });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/services/:id — detail + reviews
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const service = await ServiceListing.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const reviews = await ServiceReview.find({ serviceId: service._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ service, reviews });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/services/:id — update/deactivate (owner only)
router.patch(
  '/:id',
  authenticate,
  [
    body('title').optional().notEmpty().trim(),
    body('category').optional().isIn(['movers', 'cleaning', 'painting', 'plumbing', 'electricity', 'carpentry', 'other']),
    body('priceType').optional().isIn(['hourly', 'fixed', 'quote']),
    body('price').optional({ nullable: true }).isFloat({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const service = await ServiceListing.findById(req.params.id);
      if (!service) return res.status(404).json({ error: 'Service not found' });
      if (String(service.providerId) !== String(req.user.id))
        return res.status(403).json({ error: 'Not your listing' });

      const allowed = ['title', 'description', 'category', 'priceType', 'price', 'cities', 'phone', 'isActive'];
      allowed.forEach((k) => { if (req.body[k] !== undefined) service[k] = req.body[k]; });
      await service.save();

      res.json({ service });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/services/:id — remove listing and its reviews (owner only)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const service = await ServiceListing.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (String(service.providerId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Not your listing' });
    }

    await service.deleteOne();
    await ServiceReview.deleteMany({ serviceId: service._id });

    res.json({ message: 'Service deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/services/:id/review — submit review; update average rating
router.post(
  '/:id/review',
  authenticate,
  [
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const service = await ServiceListing.findById(req.params.id);
      if (!service) return res.status(404).json({ error: 'Service not found' });

      const { User } = require('../models');
      const reviewer = await User.findByPk(req.user.id, { attributes: ['firstName', 'lastName'] });
      const reviewerName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : null;

      // Upsert: one review per reviewer per service (enforced by unique index)
      let review;
      try {
        review = await ServiceReview.create({
          serviceId:    service._id,
          reviewerId:   req.user.id,
          reviewerName,
          rating:       req.body.rating,
          comment:      req.body.comment,
        });
      } catch (dupErr) {
        if (dupErr.code === 11000) {
          // Update existing review
          review = await ServiceReview.findOneAndUpdate(
            { serviceId: service._id, reviewerId: req.user.id },
            { rating: req.body.rating, comment: req.body.comment, reviewerName },
            { new: true }
          );
        } else {
          throw dupErr;
        }
      }

      // Recalculate average rating
      const agg = await ServiceReview.aggregate([
        { $match: { serviceId: service._id } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);
      if (agg.length > 0) {
        service.rating      = Math.round(agg[0].avg * 10) / 10;
        service.reviewCount = agg[0].count;
        await service.save();
      }

      res.status(201).json({ review, rating: service.rating, reviewCount: service.reviewCount });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
