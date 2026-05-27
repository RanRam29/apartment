const { UserKycProfile } = require('../models');

async function requireKycApproved(req, res, next) {
  if (req.user?.role === 'admin') return next();

  const kyc = await UserKycProfile.findOne({ where: { userId: req.user.id } });
  if (!kyc || kyc.status !== 'APPROVED') {
    return res.status(403).json({
      error: 'KYC verification required',
      code: 'KYC_REQUIRED',
      kycStatus: kyc?.status || 'NOT_STARTED',
    });
  }
  next();
}

module.exports = { requireKycApproved };
