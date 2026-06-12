const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/security');
const { User } = require('../models');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
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

function requireCurrentRole(...roles) {
  return async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user?.id, { attributes: ['id', 'role'] });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      req.user.role = user.role;
      next();
    } catch (err) {
      next(err);
    }
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

module.exports = { authenticate, requireRole, requireCurrentRole, requireVerified };
