const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { scoreLeads } = require('../services/aiServiceClient');

const router = express.Router();

// POST /api/leads/score — rank tenant leads for an apartment (Node default; optional ai-service proxy)
router.post(
  '/score',
  authenticate,
  requireRole('landlord'),
  [
    body('apartment').isObject().withMessage('apartment object is required'),
    body('apartment.price').isInt({ min: 0 }).withMessage('apartment.price is required'),
    body('leads').isArray({ min: 0 }).withMessage('leads must be an array'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }

      const { apartment, leads } = req.body;
      const ranked = await scoreLeads(leads, apartment);

      res.json({ leads: ranked, total: ranked.length });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
