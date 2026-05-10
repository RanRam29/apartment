const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const { UserPreferences } = require('../models');
const { registerValidator, loginValidator } = require('../utils/validators');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { getJwtSecret } = require('../config/security');
const { sendVerificationEmail } = require('../services/emailService');
const logger = require('../utils/logger');

const router = express.Router();

async function issueVerificationTokenForUser(user) {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationCacheKey = `email:verify:${verificationToken}`;
  await safeCacheSet(verificationCacheKey, { userId: user.id }, 24 * 60 * 60);

  const appBaseUrl =
    process.env.APP_BASE_URL ||
    process.env.CLIENT_ORIGIN ||
    'http://localhost:3000';
  const cleanBase = String(appBaseUrl).replace(/\/$/, '');
  const verificationUrl = `${cleanBase}/verify-email?token=${verificationToken}`;

  try {
    await sendVerificationEmail({ to: user.email, verificationUrl });
  } catch (err) {
    logger.warn(`Verification email failed for ${user.id}: ${err.message}`);
  }

  return verificationToken;
}

function signToken(user) {
  const jwtSecret = getJwtSecret();
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, isPremium: Boolean(user.isPremium) },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/** Returns a JWT or sends 503 if signing fails (e.g. JWT_SECRET missing on the host). */
function signTokenOr503(user, res) {
  try {
    return signToken(user);
  } catch (err) {
    logger.error(`JWT sign failed (${user?.email || user?.id}): ${err.message}`);
    res.status(503).json({
      error: 'Authentication service is misconfigured',
      code: 'JWT_SIGN_FAILED',
    });
    return null;
  }
}

/** Redis cache is optional; failures must not block auth flows (e.g. flaky hosted Redis). */
async function safeCacheSet(key, value, ttlSeconds) {
  try {
    await cacheSet(key, value, ttlSeconds);
  } catch (err) {
    logger.warn(`Redis cacheSet failed (${key}): ${err.message}`);
  }
}

// POST /api/auth/register
router.post('/register', registerValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, phone } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      phone: phone || null,
    });

    // Create empty preferences doc in MongoDB for tenants (fire-and-forget)
    if (role === 'tenant') {
      UserPreferences.create({ userId: user.id }).catch((err) => {
        logger.warn('Failed to create UserPreferences doc:', err.message);
      });
    }

    const token = signTokenOr503(user, res);
    if (!token) return;

    const verificationToken = await issueVerificationTokenForUser(user);
    try {
      await user.update({ verificationToken, verifiedAt: null });
    } catch (err) {
      logger.warn(`Failed to persist verification token for user ${user.id}: ${err.message}`);
    }

    logger.info(`New user registered: ${user.id} (${role})`);

    const payload = {
      token,
      verificationRequired: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        isPremium: user.isPremium,
      },
    };
    if (process.env.NODE_ENV === 'test' && verificationToken) payload.verificationToken = verificationToken;

    res.status(201).json(payload);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', loginValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    let user;
    try {
      user = await User.findOne({ where: { email } });
    } catch (err) {
      logger.error(`Login lookup failed for ${email}: ${err.message}`);
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let valid;
    try {
      valid = await bcrypt.compare(password, user.passwordHash);
    } catch (err) {
      logger.warn(`bcrypt.compare failed for login ${email}: ${err.message}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!user.isVerified && smtpConfigured) {
      return res.status(403).json({
        error: 'Please verify your email before logging in',
        code: 'EMAIL_NOT_VERIFIED',
        verificationRequired: true,
        resendAvailable: true,
        email: user.email,
      });
    }
    if (!user.isVerified && !smtpConfigured) {
      await user.update({ isVerified: true, verifiedAt: new Date() });
    }

    try {
      await user.update({ lastActiveAt: new Date() });
    } catch (err) {
      logger.warn(`Failed to update lastActiveAt for user ${user.id}: ${err.message}`);
    }

    const token = signTokenOr503(user, res);
    if (!token) return;

    // Cache basic user profile for fast lookups
    await safeCacheSet(`user:${user.id}`, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    }, 3600);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        isPremium: user.isPremium,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/verify/:token
router.get('/verify/:token', async (req, res, next) => {
  try {
    const token = req.params.token;
    if (!token || token.length < 20) return res.status(400).json({ error: 'Invalid or expired verification token' });

    // Prefer DB token (used by some tests and production flows)
    const userByToken = await User.findOne({ where: { verificationToken: token } });
    if (userByToken) {
      await userByToken.update({
        isVerified: true,
        verifiedAt: new Date(),
        verificationToken: null,
      });
      await cacheDel(`email:verify:${token}`).catch(() => {});
      return res.json({ message: 'Email verified successfully' });
    }

    // Fallback to Redis token
    const cacheKey = `email:verify:${token}`;
    const cached = await cacheGet(cacheKey);
    if (!cached?.userId) return res.status(400).json({ error: 'Invalid or expired verification token' });

    const user = await User.findByPk(cached.userId);
    if (!user) return res.status(400).json({ error: 'Invalid verification token' });

    await user.update({ isVerified: true, verifiedAt: new Date() });
    await cacheDel(cacheKey);
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify/resend
router.post('/verify/resend', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(422).json({ error: 'email is required' });

    const user = await User.findOne({ where: { email } });
    if (user && !user.isVerified) {
      const verificationToken = await issueVerificationTokenForUser(user);
      user.update({ verificationToken, verifiedAt: null }).catch((err) =>
        logger.warn(`Failed to persist resend verification token: ${err.message}`)
      );

      const payload = {
        message: 'If the email exists and is unverified, a verification link has been sent',
      };
      if (process.env.NODE_ENV === 'test' && verificationToken) payload.verificationToken = verificationToken;
      return res.json(payload);
    }

    res.json({ message: 'If the email exists and is unverified, a verification link has been sent' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-verification (authenticated)
router.post('/resend-verification', require('../middleware/auth').authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.status(400).json({ error: 'Account already verified' });

    const verificationToken = await issueVerificationTokenForUser(user);
    try {
      await user.update({ verificationToken, verifiedAt: null });
    } catch (err) {
      logger.warn(`Failed to persist verification token (resend-verification): ${err.message}`);
    }

    res.json({ ok: true, message: 'Verification email sent' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = jwt.verify(token, getJwtSecret());
        await cacheDel(`user:${decoded.id}`).catch((err) =>
          logger.warn(`Redis cacheDel failed on logout: ${err.message}`)
        );
      } catch {
        // token already invalid — fine
      }
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/profile — update name and/or phone
router.patch('/profile', require('../middleware/auth').authenticate, async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const updates = {};
    if (firstName && typeof firstName === 'string') updates.firstName = firstName.trim();
    if (lastName && typeof lastName === 'string') updates.lastName = lastName.trim();
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;

    if (Object.keys(updates).length === 0) {
      return res.status(422).json({ error: 'No valid fields to update' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update(updates);
    const { passwordHash: _, ...safeUser } = user.toJSON();
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/avatar — upload profile photo to Cloudinary
const { upload, uploadMany } = require('../services/uploadService');
router.patch(
  '/avatar',
  require('../middleware/auth').authenticate,
  upload.single('avatar'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'avatar file required' });

      const [uploaded] = await uploadMany([req.file], 'avatars');

      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      await user.update({ avatarUrl: uploaded.url });
      const { passwordHash: _, ...safeUser } = user.toJSON();
      res.json({ user: safeUser, avatarUrl: uploaded.url });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/auth/push-token — store Expo push token (TTL 30 days in Redis)
router.patch('/push-token', require('../middleware/auth').authenticate, async (req, res, next) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken || typeof pushToken !== 'string') {
      return res.status(400).json({ error: 'pushToken required' });
    }
    await safeCacheSet(`push:token:${req.user.id}`, pushToken, 30 * 24 * 60 * 60);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-verification
module.exports = router;
