const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  WarrantyClaim,
  RentalAgreement,
  AgreementGuarantor,
} = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const { notify } = require('../services/notificationService');

const router = express.Router();

async function loadClaimForLandlord(req, res, next) {
  try {
    const claim = await WarrantyClaim.findByPk(req.params.id, {
      include: [
        { model: RentalAgreement, as: 'agreement', attributes: ['id', 'landlordId'] },
        { model: AgreementGuarantor, as: 'guarantor' },
      ],
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (req.user.role !== 'admin' && claim.agreement.landlordId !== req.user.id) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    req.claim = claim;
    next();
  } catch (err) {
    next(err);
  }
}

async function notifyClaimTransition(claim, title, body) {
  const agreement = await RentalAgreement.findByPk(claim.agreementId, {
    attributes: ['landlordId'],
  });
  if (agreement?.landlordId) {
    await notify(agreement.landlordId, {
      title,
      body,
      data: { type: 'warranty_claim', claimId: claim.id, status: claim.status },
    }).catch(() => {});
  }
}

// POST /api/v3/claims — landlord files claim
router.post(
  '/',
  authenticate,
  requireRole('landlord'),
  [
    body('agreementId').isUUID(),
    body('guarantorId').isUUID(),
    body('amount').isFloat({ min: 0.01 }),
    body('reason').trim().isLength({ min: 5 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const { agreementId, guarantorId, amount, reason } = req.body;
      const agreement = await RentalAgreement.findByPk(agreementId);
      if (!agreement || agreement.landlordId !== req.user.id) {
        return res.status(404).json({ error: 'Agreement not found' });
      }

      const guarantor = await AgreementGuarantor.findOne({
        where: { id: guarantorId, agreementId },
      });
      if (!guarantor) return res.status(404).json({ error: 'Guarantor not found for this agreement' });
      if (guarantor.invitationStatus !== 'APPROVED') {
        return res.status(422).json({ error: 'Guarantor must be approved before filing a claim' });
      }

      const claim = await WarrantyClaim.create({
        agreementId,
        guarantorId,
        amount,
        reason,
        status: 'FILED',
        filedByUserId: req.user.id,
      });

      await notifyClaimTransition(
        claim,
        'תביעת ערבות הוגשה',
        `תביעה בסך ₪${amount} הוגשה נגד ${guarantor.name}`
      );

      res.status(201).json(claim);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v3/claims — landlord or admin list
router.get('/', authenticate, async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'landlord') {
      const agreements = await RentalAgreement.findAll({
        where: { landlordId: req.user.id },
        attributes: ['id'],
      });
      where.agreementId = agreements.map((a) => a.id);
      if (!where.agreementId.length) return res.json([]);
    }

    const claims = await WarrantyClaim.findAll({
      where,
      include: [{ model: AgreementGuarantor, as: 'guarantor', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(claims);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, loadClaimForLandlord, (req, res) => {
  res.json(req.claim);
});

async function guarantorRespond(req, res, next, nextStatus) {
  try {
    const { invitationToken } = req.body;
    if (!invitationToken) return res.status(400).json({ error: 'invitationToken is required' });

    const claim = await WarrantyClaim.findByPk(req.params.id, {
      include: [{ model: AgreementGuarantor, as: 'guarantor' }],
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== 'FILED') {
      return res.status(422).json({ error: 'Claim is not awaiting guarantor response' });
    }
    if (claim.guarantor.invitationToken !== invitationToken) {
      return res.status(403).json({ error: 'Invalid guarantor token' });
    }

    await claim.update({ status: nextStatus });

    const title = nextStatus === 'ACCEPTED' ? 'ערב אישר תביעה' : 'ערב חולק על תביעה';
    const body =
      nextStatus === 'ACCEPTED'
        ? `${claim.guarantor.name} אישר/ה את תביעת הערבות`
        : `${claim.guarantor.name} חולק/ת על תביעת הערבות`;

    await notifyClaimTransition(claim, title, body);
    res.json(claim);
  } catch (err) {
    next(err);
  }
}

router.post('/:id/guarantor/accept', (req, res, next) =>
  guarantorRespond(req, res, next, 'ACCEPTED')
);

router.post('/:id/guarantor/dispute', (req, res, next) =>
  guarantorRespond(req, res, next, 'DISPUTED')
);

router.post(
  '/:id/resolve',
  authenticate,
  requireRole('admin'),
  [body('resolutionNote').optional().trim().isLength({ max: 2000 })],
  async (req, res, next) => {
    try {
      const claim = await WarrantyClaim.findByPk(req.params.id, {
        include: [{ model: AgreementGuarantor, as: 'guarantor' }],
      });
      if (!claim) return res.status(404).json({ error: 'Claim not found' });
      if (claim.status === 'RESOLVED') {
        return res.status(422).json({ error: 'Claim is already resolved' });
      }
      if (!['ACCEPTED', 'DISPUTED', 'FILED'].includes(claim.status)) {
        return res.status(422).json({ error: 'Claim cannot be resolved from current status' });
      }

      await claim.update({
        status: 'RESOLVED',
        resolutionNote: req.body.resolutionNote || null,
      });

      await notifyClaimTransition(claim, 'תביעת ערבות נסגרה', 'אדמין סגר/ה את תביעת הערבות');
      res.json(claim);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
