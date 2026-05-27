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
      attributes: ['id', 'role', 'activeRole', 'email', 'isPremium', 'isVerified', 'isLocked', 'tosAcceptedAt'],
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (user.isLocked) {
      return res.status(403).json({ error: 'Account locked', code: 'ACCOUNT_LOCKED' });
    }
    req.user = {
      id: user.id,
      role: user.role === 'admin' ? 'admin' : (user.activeRole || user.role),
      email: user.email,
      isPremium: Boolean(user.isPremium),
      isVerified: Boolean(user.isVerified),
      tosAcceptedAt: user.tosAcceptedAt,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Restrict routes to given roles. Users with role `admin` may access any role-gated route
 * (tenant / landlord / admin-only) so ops accounts can exercise the full API.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (req.user?.role === 'admin') {
      return next();
    }
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

async function requireVerified(req, res, next) {
  try {
    if (req.user?.role === 'admin') {
      return next();
    }
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
