const { RentalAgreement, AgreementParty } = require('../models');

/**
 * Loads the agreement named by req.params[paramName] and verifies the
 * authenticated user is its landlord, one of its parties, or an admin.
 * Responds 404 (not 403) to outsiders so agreement existence is not leaked.
 * On success sets req.agreement and req.agreementAccess.
 * Must run AFTER authenticate.
 */
function loadAgreement(paramName = 'id') {
  return async (req, res, next) => {
    try {
      const agreement = await RentalAgreement.findByPk(req.params[paramName]);
      if (!agreement) {
        return res.status(404).json({ error: 'Agreement not found' });
      }

      const isAdmin = req.user.role === 'admin';
      const isLandlord = agreement.landlordId === req.user.id;
      let isParty = false;
      if (!isAdmin && !isLandlord) {
        isParty = !!(await AgreementParty.findOne({
          where: { agreementId: agreement.id, userId: req.user.id },
          attributes: ['id'],
        }));
      }

      if (!isAdmin && !isLandlord && !isParty) {
        return res.status(404).json({ error: 'Agreement not found' });
      }

      req.agreement = agreement;
      req.agreementAccess = { isAdmin, isLandlord, isParty };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Restricts a route to the agreement's landlord (or admin). Requires loadAgreement first. */
function requireAgreementLandlord(req, res, next) {
  if (req.agreementAccess?.isLandlord || req.agreementAccess?.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Only the agreement landlord may perform this action' });
}

module.exports = { loadAgreement, requireAgreementLandlord };
