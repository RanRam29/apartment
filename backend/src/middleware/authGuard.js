const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/security');
const { User, UserKycProfile } = require('../models');

async function authGuard(req, res, next) {
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
      include: [{
        model: UserKycProfile,
        as: 'kycProfile',
        attributes: ['status', 'roleType'],
        required: false,
      }],
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
      kycStatus: user.kycProfile?.status || null,
    };
    next();
  } catch (err) {
    next(err);
  }
}

function requireKyc(req, res, next) {
  if (req.user?.role === 'admin') return next();
  if (req.user?.kycStatus !== 'APPROVED') {
    return res.status(403).json({ error: 'KYC verification required' });
  }
  next();
}

function requireAgreementRole(...roles) {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authGuard, requireKyc, requireAgreementRole };
