const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { User } = require('../models');
const RoommateProfile = require('../models/mongo/RoommateProfile');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Compatibility scoring ────────────────────────────────────────────────────
// Weights must sum to 100.
const WEIGHTS = {
  sleepSchedule:    25,
  cleanlinessLevel: 20,
  noiseLevel:       20,
  guestsFrequency:  15,
  smokingAllowed:   10,
  petsAllowed:       5,
  workFromHome:      5,
};

const GUEST_ORDER = ['never', 'rarely', 'sometimes', 'often'];

function compatibilityScore(a, b) {
  let score = 0;

  // sleepSchedule: exact match or one is flexible
  if (a.sleepSchedule === b.sleepSchedule || a.sleepSchedule === 'flexible' || b.sleepSchedule === 'flexible') {
    score += WEIGHTS.sleepSchedule;
  }

  // cleanlinessLevel: full points if |diff| <= 1, partial otherwise
  const cleanDiff = Math.abs((a.cleanlinessLevel || 3) - (b.cleanlinessLevel || 3));
  score += WEIGHTS.cleanlinessLevel * Math.max(0, 1 - cleanDiff / 4);

  // noiseLevel: exact match
  if (a.noiseLevel === b.noiseLevel) score += WEIGHTS.noiseLevel;
  else if (
    (a.noiseLevel === 'moderate') ||
    (b.noiseLevel === 'moderate')
  ) score += WEIGHTS.noiseLevel * 0.5;

  // guestsFrequency: based on ordinal distance
  const gAIdx = GUEST_ORDER.indexOf(a.guestsFrequency);
  const gBIdx = GUEST_ORDER.indexOf(b.guestsFrequency);
  const guestDiff = Math.abs(gAIdx - gBIdx);
  score += WEIGHTS.guestsFrequency * Math.max(0, 1 - guestDiff / 3);

  // boolean fields: full points if same
  if (a.smokingAllowed === b.smokingAllowed) score += WEIGHTS.smokingAllowed;
  if (a.petsAllowed    === b.petsAllowed)    score += WEIGHTS.petsAllowed;
  if (a.workFromHome   === b.workFromHome)   score += WEIGHTS.workFromHome;

  return Math.round(score);
}

// ─── GET /api/roommates/profile — own profile ─────────────────────────────────
router.get('/profile', authenticate, requireRole('tenant'), async (req, res, next) => {
  try {
    const profile = await RoommateProfile.findOne({ userId: req.user.id }).lean();
    res.json({ profile: profile || null });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/roommates/profile — create / update ───────────────────────────
router.post(
  '/profile',
  authenticate,
  requireRole('tenant'),
  [
    body('lookingForRoommate').optional().isBoolean(),
    body('sleepSchedule').optional().isIn(['early_bird', 'night_owl', 'flexible']),
    body('cleanlinessLevel').optional().isInt({ min: 1, max: 5 }),
    body('noiseLevel').optional().isIn(['quiet', 'moderate', 'lively']),
    body('guestsFrequency').optional().isIn(['never', 'rarely', 'sometimes', 'often']),
    body('smokingAllowed').optional().isBoolean(),
    body('petsAllowed').optional().isBoolean(),
    body('workFromHome').optional().isBoolean(),
    body('cities').optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const {
        lookingForRoommate, sleepSchedule, cleanlinessLevel,
        noiseLevel, guestsFrequency, smokingAllowed, petsAllowed,
        workFromHome, cities,
      } = req.body;

      const user = await User.findByPk(req.user.id, { attributes: ['firstName', 'lastName', 'avatarUrl'] });

      const update = {
        ...(lookingForRoommate !== undefined && { lookingForRoommate }),
        ...(sleepSchedule    !== undefined && { sleepSchedule }),
        ...(cleanlinessLevel !== undefined && { cleanlinessLevel: Number(cleanlinessLevel) }),
        ...(noiseLevel       !== undefined && { noiseLevel }),
        ...(guestsFrequency  !== undefined && { guestsFrequency }),
        ...(smokingAllowed   !== undefined && { smokingAllowed }),
        ...(petsAllowed      !== undefined && { petsAllowed }),
        ...(workFromHome     !== undefined && { workFromHome }),
        ...(cities           !== undefined && { cities }),
        firstName: user.firstName,
        lastName:  user.lastName,
        avatarUrl: user.avatarUrl,
      };

      const profile = await RoommateProfile.findOneAndUpdate(
        { userId: req.user.id },
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json({ profile });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/roommates/matches — compatible roommates ───────────────────────
router.get('/matches', authenticate, requireRole('tenant'), async (req, res, next) => {
  try {
    const myProfile = await RoommateProfile.findOne({ userId: req.user.id }).lean();
    if (!myProfile) {
      return res.status(400).json({ error: 'Complete your roommate profile first' });
    }

    const others = await RoommateProfile.find({
      userId: { $ne: req.user.id },
      lookingForRoommate: true,
    }).lean();

    const scored = others
      .map((p) => ({ ...p, score: compatibilityScore(myProfile, p) }))
      .filter((p) => p.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    res.json({ matches: scored, total: scored.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
