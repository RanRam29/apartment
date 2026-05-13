const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/security');
const { User } = require('../models');

/**
 * Verify JWT, then load the user row so role / flags match the database.
 * Prevents 403s when the UI (via GET /auth/me) reflects an updated role while an older JWT still carries the previous role.
 */
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

  try {
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'role', 'email', 'isPremium', 'isVerified'],
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      isPremium: Boolean(user.isPremium),
      isVerified: Boolean(user.isVerified),
    };
    next();
  } catch (err) {
    next(err);
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
