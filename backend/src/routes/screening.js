const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { getJwtSecret } = require('../config/security');
const { Match } = require('../models');
const IdentityVerification = require('../models/mongo/IdentityVerification');
const logger = require('../utils/logger');

const router = express.Router();

function getIdentityHashSecret() {
  const secret = process.env.IDENTITY_HASH_SECRET?.trim();
  if (secret) {
    if (secret.length < 20) {
      throw new Error('IDENTITY_HASH_SECRET must be at least 20 characters');
    }
    return secret;
  }
  return getJwtSecret();
}

function hashId(idNumber) {
  return crypto
    .createHmac('sha256', getIdentityHashSecret())
    .update(idNumber.trim())
    .digest('hex');
}

function legacyHashId(idNumber) {
  return crypto.createHash('sha256').update(idNumber.trim()).digest('hex');
}

function idHashLookupValues(idNumber) {
  return [...new Set([hashId(idNumber), legacyHashId(idNumber)])];
}

function isDuplicateIdentityClaimError(err) {
  return err?.code === 11000 && (
    err?.keyPattern?.idNumberHash ||
    err?.keyValue?.idNumberHash ||
    err?.keyPattern?.userId ||
    err?.keyValue?.userId
  );
}

// ─── POST /api/screening/identity — tenant submits verification request ────────
router.post(
  '/identity',
  authenticate,
  requireRole('tenant'),
  [
    body('idNumber')
      .trim()
      .matches(/^\d{9}$/)
      .withMessage('מספר תעודת זהות חייב להכיל בדיוק 9 ספרות'),
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('שם מלא נדרש'),
    body('phone')
      .trim()
      .matches(/^(\+972|0)[0-9]{8,9}$/)
      .withMessage('מספר טלפון ישראלי לא תקין'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const { idNumber, fullName, phone } = req.body;
      const normalizedIdNumber = idNumber.trim();

      // Prevent re-submission if already verified
      const existing = await IdentityVerification.findOne({ userId: req.user.id });
      if (existing?.status === 'verified') {
        return res.status(409).json({ error: 'Identity already verified', status: 'verified' });
      }

      const idHash = hashId(normalizedIdNumber);

      // Check if this ID number is already claimed by another user
      const claimed = await IdentityVerification.findOne({
        idNumberHash: { $in: idHashLookupValues(normalizedIdNumber) },
        userId: { $ne: req.user.id },
      });
      if (claimed) {
        return res.status(409).json({ error: 'מספר תעודת הזהות כבר רשום במערכת' });
      }

      const record = await IdentityVerification.findOneAndUpdate(
        { userId: req.user.id },
        {
          $set: {
            idNumberHash: idHash,
            idNumberLast4: normalizedIdNumber.slice(-4),
            fullName: fullName.trim(),
            phone: phone.trim(),
            status: 'pending',
            rejectedReason: null,
            verifiedAt: null,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // In production: dispatch to BDI / gov ID service here.
      // For demo: auto-approve after a short delay (simulates async check).
      setImmediate(async () => {
        try {
          await IdentityVerification.findOneAndUpdate(
            { userId: req.user.id, status: 'pending' },
            { $set: { status: 'verified', verifiedAt: new Date() } }
          );
          logger.info(`[screening] Auto-verified userId=${req.user.id} (demo mode)`);
        } catch (err) {
          logger.error('[screening] Auto-verify failed:', err.message);
        }
      });

      res.status(202).json({
        message: 'הבקשה התקבלה ונמצאת בבדיקה',
        status: record.status,
        idNumberLast4: record.idNumberLast4,
      });
    } catch (err) {
      if (isDuplicateIdentityClaimError(err)) {
        return res.status(409).json({ error: 'מספר תעודת הזהות כבר רשום במערכת' });
      }
      next(err);
    }
  }
);

// ─── GET /api/screening/status — own verification status ─────────────────────
router.get('/status', authenticate, requireRole('tenant'), async (req, res, next) => {
  try {
    const record = await IdentityVerification.findOne(
      { userId: req.user.id },
      { idNumberHash: 0 }           // never expose the hash
    ).lean();
    res.json({ verification: record || null });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/screening/tenant/:userId — landlord checks a tenant's status ───
// Only allowed when the landlord has an active match with that tenant.
router.get('/tenant/:userId', authenticate, requireRole('landlord'), async (req, res, next) => {
  try {
    const tenantId = req.params.userId;

    const match = await Match.findOne({
      where: { tenantId, landlordId: req.user.id },
    });
    if (!match) {
      return res.status(403).json({ error: 'No active match with this tenant' });
    }

    const record = await IdentityVerification.findOne(
      { userId: tenantId },
      { idNumberHash: 0, idNumberLast4: 0 }   // show status + name only
    ).lean();

    res.json({
      tenantId,
      verification: record
        ? { status: record.status, fullName: record.fullName, verifiedAt: record.verifiedAt }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
