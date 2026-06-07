const { RentalAgreement } = require('../models');

const LOCKED_STATUSES = ['SIGNED', 'ACTIVE'];
const BLOCKED_METHODS = ['PUT', 'PATCH', 'DELETE'];

async function stateLockGuard(req, res, next) {
  if (!BLOCKED_METHODS.includes(req.method)) {
    return next();
  }

  const agreementId = req.params.id || req.params.agreementId;
  if (!agreementId) {
    return next();
  }

  try {
    const agreement = await RentalAgreement.findByPk(agreementId, {
      attributes: ['id', 'status'],
    });

    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    if (LOCKED_STATUSES.includes(agreement.status)) {
      return res.status(423).json({
        error: 'Agreement is locked',
        message: `Cannot modify agreement in ${agreement.status} status`,
        status: agreement.status,
      });
    }

    req.agreement = agreement;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { stateLockGuard };
