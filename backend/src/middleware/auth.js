const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/security');
const { User } = require('../models');
const { isEmailVerificationEnforced } = require('../utils/emailVerification');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (!isEmailVerificationEnforced()) {
    req.user = decoded;
    return next();
  }

  try {
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'email', 'role', 'isVerified', 'isPremium'],
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Please verify your email before continuing',
        code: 'EMAIL_NOT_VERIFIED',
        verificationRequired: true,
        resendAvailable: true,
        email: user.email,
      });
    }

    req.user = {
      ...decoded,
      email: user.email,
      role: user.role,
      isPremium: Boolean(user.isPremium),
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

async function requireVerified(req, res, next) {
  try {
    const user = await User.findByPk(req.user?.id, { attributes: ['id', 'isVerified'] });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!user.isVerified) {
      return res.status(403).json({ error: 'Email verification required before swiping' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate, requireRole, requireVerified };
