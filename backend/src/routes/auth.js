const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const { UserPreferences } = require('../models');
const { registerValidator, loginValidator } = require('../utils/validators');
const { cacheSet, cacheDel } = require('../config/redis');
const { getJwtSecret } = require('../config/security');
const { sendVerificationEmail } = require('../services/emailService');
const logger = require('../utils/logger');

const router = express.Router();

function signToken(user) {
  const jwtSecret = getJwtSecret();
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, isPremium: Boolean(user.isPremium) },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
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

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      phone: phone || null,
      verificationToken,
      isVerified: false,
      verifiedAt: null,
    });

    // Create empty preferences doc in MongoDB for tenants
    if (role === 'tenant') {
      await UserPreferences.create({ userId: user.id });
    }

    const token = signToken(user);
    const appBaseUrl = process.env.APP_BASE_URL || process.env.CLIENT_ORIGIN || 'http://localhost:3000';
    const verificationUrl = `${appBaseUrl.replace(/\/$/, '')}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail({ to: email, verificationUrl });

    logger.info(`New user registered: ${user.id} (${role})`);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        isPremium: user.isPremium,
      },
    });
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

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await user.update({ lastActiveAt: new Date() });

    const token = signToken(user);

    // Cache basic user profile for fast lookups
    await cacheSet(`user:${user.id}`, {
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

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = jwt.verify(token, getJwtSecret());
        await cacheDel(`user:${decoded.id}`);
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
    await cacheSet(`push:token:${req.user.id}`, pushToken, 30 * 24 * 60 * 60);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', require('../middleware/auth').authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) {
      return res.status(400).json({ error: 'Account already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await user.update({ verificationToken });

    const appBaseUrl = process.env.APP_BASE_URL || process.env.CLIENT_ORIGIN || 'http://localhost:3000';
    const verificationUrl = `${appBaseUrl.replace(/\/$/, '')}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail({ to: user.email, verificationUrl });

    res.json({ ok: true, message: 'Verification email sent' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
