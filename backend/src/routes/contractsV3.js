const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { loadAgreement, requireAgreementLandlord } = require('../middleware/agreementAccess');
const { uploadAndExtract, transitionState, validateGate, renewContract, activateRenewal } = require('../services/contractServiceV3');
const { Op } = require('sequelize');
const { RentalAgreement, AgreementParty, AgreementRoom, OwnershipVerification, ContractAmendment, Apartment } = require('../models');
const { getPresignedUrl, uploadFile, BUCKETS } = require('../services/r2Service');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

// 1. Upload contract + AI extraction
router.post('/upload',
  requireRole('landlord'),
  upload.single('contract'),
  async (req, res, next) => {
    try {
      const { propertyId } = req.body;
      if (!propertyId) return res.status(400).json({ error: 'propertyId is required' });
      if (!req.file) return res.status(400).json({ error: 'Contract file is required' });

      const result = await uploadAndExtract(req.file, req.user.id, propertyId);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// 2. List agreements for current user (landlord / tenant / admin)
router.get('/', async (req, res, next) => {
  try {
    const role = req.user.activeRole || req.user.role;
    let agreements;

    if (role === 'landlord') {
      agreements = await RentalAgreement.findAll({
        where: { landlordId: req.user.id },
        order: [['createdAt', 'DESC']],
        limit: 100,
      });
    } else if (role === 'admin') {
      agreements = await RentalAgreement.findAll({
        order: [['createdAt', 'DESC']],
        limit: 100,
      });
    } else {
      const parties = await AgreementParty.findAll({
        where: { userId: req.user.id, role: 'tenant' },
      });
      const ids = parties.map((p) => p.agreementId);
      agreements = ids.length
        ? await RentalAgreement.findAll({
            where: { id: { [Op.in]: ids } },
            order: [['createdAt', 'DESC']],
          })
        : [];
    }

    const payload = await Promise.all(
      agreements.map(async (a) => {
        const json = a.toJSON();
        const apt = await Apartment.findByPk(a.propertyId, {
          attributes: ['id', 'title', 'address', 'city'],
        });
        return { ...json, apartment: apt };
      })
    );

    res.json({ agreements: payload, total: payload.length });
  } catch (err) {
    next(err);
  }
});

// 3. Get contract details
router.get('/:id', loadAgreement(), async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id, {
      include: [
        { model: AgreementParty, as: 'parties' },
        { model: AgreementRoom, as: 'rooms' },
      ],
    });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    let amendments = [];
    try {
      amendments = await ContractAmendment.findAll({
        where: { contractId: agreement.id },
        order: [['createdAt', 'DESC']],
      });
    } catch (_) {
      amendments = [];
    }

    let docUrl = null;
    if (agreement.r2DocKey) {
      docUrl = await getPresignedUrl(BUCKETS.CONTRACT_DOCS, agreement.r2DocKey);
    }

    res.json({ ...agreement.toJSON(), amendments, documentUrl: docUrl });
  } catch (err) {
    next(err);
  }
});

// 3. Update extracted fields (manual corrections)
router.patch('/:id/fields', requireRole('landlord'), loadAgreement(), requireAgreementLandlord, async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.status !== 'UPLOAD') {
      return res.status(422).json({ error: 'Can only edit fields in UPLOAD state' });
    }

    const allowed = ['startDate', 'endDate', 'monthlyRentIls', 'paymentDueDay', 'cpiLinked'];
    const updates = {};
    for (const f of allowed) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    await agreement.update(updates);
    res.json(agreement);
  } catch (err) {
    next(err);
  }
});

// 4. Invite tenant to contract
router.post('/:id/invite-tenant', requireRole('landlord'), loadAgreement(), requireAgreementLandlord, async (req, res, next) => {
  try {
    const { tenantUserId } = req.body;
    if (!tenantUserId) return res.status(400).json({ error: 'tenantUserId is required' });

    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    const party = await AgreementParty.create({
      agreementId: agreement.id,
      userId: tenantUserId,
      role: 'tenant',
    });
    res.status(201).json(party);
  } catch (err) {
    next(err);
  }
});

// 5. Validation gate check
router.get('/:id/validate', loadAgreement(), async (req, res, next) => {
  try {
    const result = await validateGate(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 6. State transition
router.post('/:id/transition', loadAgreement(), requireAgreementLandlord, async (req, res, next) => {
  try {
    const { targetStatus } = req.body;
    const agreement = await transitionState(req.params.id, targetStatus);
    res.json(agreement);
  } catch (err) {
    if (err.reasons) return res.status(err.status || 422).json({ error: err.message, reasons: err.reasons });
    next(err);
  }
});

// 7. Sign contract
router.post('/:id/sign', loadAgreement(), async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.status !== 'PENDING_SIGN') {
      return res.status(422).json({ error: 'Contract is not in PENDING_SIGN state' });
    }

    if (agreement.landlordId === req.user.id) {
      await agreement.update({ landlordSignedAt: new Date() });
    }

    const party = await AgreementParty.findOne({
      where: { agreementId: agreement.id, userId: req.user.id },
    });
    if (party) {
      await party.update({ signedAt: new Date() });
    }

    // Wire gamification (fire-and-forget)
    try {
      const gamificationService = require('../services/gamificationService');
      gamificationService.awardPoints(req.user.id, 'contract_signed').catch(() => {});
    } catch (_) {}

    const allParties = await AgreementParty.findAll({ where: { agreementId: agreement.id } });
    const allSigned = allParties.every(p => p.signedAt) && !!agreement.landlordSignedAt;
    if (allSigned) {
      await agreement.update({ status: 'ACTIVE' });
      // Generate financial ledger rows automatically
      try {
        const { generateLedger } = require('../services/ledgerService');
        await generateLedger(agreement.id);
      } catch (_) { /* ledger generation failure shouldn't rollback signature */ }
    }

    res.json({ signed: true, allSigned, status: agreement.status });
  } catch (err) {
    next(err);
  }
});

// 8. Ownership verification by tenant
router.post('/:id/verify-ownership', loadAgreement(), async (req, res, next) => {
  try {
    // Only tenant parties record ownership verification (landlord verifying themselves is meaningless)
    if (!req.agreementAccess.isParty && !req.agreementAccess.isAdmin) {
      return res.status(403).json({ error: 'Only a tenant party may verify ownership' });
    }
    const { choice } = req.body; // 'verified' or 'skipped'
    if (!['verified', 'skipped'].includes(choice)) {
      return res.status(400).json({ error: 'choice must be "verified" or "skipped"' });
    }

    const record = await OwnershipVerification.create({
      agreementId: req.params.id,
      tenantId: req.user.id,
      choice,
    });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

// 9. Upload check-in photos for a room
router.post('/:id/checkin/:roomId/photos',
  loadAgreement(),
  upload.array('photos', 20),
  async (req, res, next) => {
    try {
      const room = await AgreementRoom.findByPk(req.params.roomId);
      if (!room || room.agreementId !== req.params.id) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const agreement = await RentalAgreement.findByPk(req.params.id);
      if (!agreement || agreement.status !== 'ACTIVE') {
        return res.status(422).json({ error: 'Contract must be in ACTIVE state for check-in' });
      }

      const photoKeys = [];
      if (req.files) {
        for (const file of req.files) {
          const key = `checkin/${agreement.id}/${room.id}/${Date.now()}-${file.originalname || 'photo.jpg'}`;
          await uploadFile(BUCKETS.CHECKIN_PHOTOS, key, file.buffer, file.mimetype || 'image/jpeg');
          photoKeys.push(key);
        }
      }

      const existing = room.checkinPhotos || [];
      await room.update({ checkinPhotos: [...existing, ...photoKeys] });
      res.json({ uploaded: photoKeys.length, total: room.checkinPhotos.length });
    } catch (err) {
      next(err);
    }
  }
);

// 10. Complete check-in (landlord confirms)
router.post('/:id/checkin/complete', requireRole('landlord'), loadAgreement(), requireAgreementLandlord, async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id, {
      include: [{ model: AgreementRoom, as: 'rooms' }],
    });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.status !== 'ACTIVE') {
      return res.status(422).json({ error: 'Contract must be ACTIVE for check-in' });
    }
    if (agreement.checkinCompletedAt) {
      return res.status(422).json({ error: 'Check-in already completed' });
    }

    await agreement.update({ checkinCompletedAt: new Date() });
    res.json({ checkinCompleted: true, completedAt: agreement.checkinCompletedAt });
  } catch (err) {
    next(err);
  }
});

// 11. Upload check-out photos for a room
router.post('/:id/checkout/:roomId/photos',
  loadAgreement(),
  upload.array('photos', 20),
  async (req, res, next) => {
    try {
      const room = await AgreementRoom.findByPk(req.params.roomId);
      if (!room || room.agreementId !== req.params.id) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const photoKeys = [];
      if (req.files) {
        for (const file of req.files) {
          const key = `checkout/${req.params.id}/${room.id}/${Date.now()}-${file.originalname || 'photo.jpg'}`;
          await uploadFile(BUCKETS.CHECKIN_PHOTOS, key, file.buffer, file.mimetype || 'image/jpeg');
          photoKeys.push(key);
        }
      }

      const existing = room.checkoutPhotos || [];
      await room.update({ checkoutPhotos: [...existing, ...photoKeys] });
      res.json({ uploaded: photoKeys.length });
    } catch (err) {
      next(err);
    }
  }
);

// 12. Landlord reviews check-out (approve or add notes)
router.post('/:id/checkout/review', requireRole('landlord'), loadAgreement(), requireAgreementLandlord, async (req, res, next) => {
  try {
    const { roomId, notes, approved } = req.body;
    const room = await AgreementRoom.findByPk(roomId);
    if (!room || room.agreementId !== req.params.id) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!approved && notes) {
      await room.update({ checkoutNotes: notes, checkoutPhotos: [] });
      return res.json({ status: 'revision_requested', notes });
    }

    res.json({ status: 'approved' });
  } catch (err) {
    next(err);
  }
});

// 13. Complete check-out — both parties sign
router.post('/:id/checkout/complete', loadAgreement(), async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    await agreement.update({ checkoutCompletedAt: new Date() });
    const { recalcTrustScoreForAgreement } = require('../services/trustScoreService');
    await recalcTrustScoreForAgreement(agreement.id);
    res.json({ checkoutCompleted: true });
  } catch (err) {
    next(err);
  }
});

// 14. Renew contract (creates a PENDING_ACTIVATION copy)
router.post('/:id/renew',
  requireRole('landlord'),
  loadAgreement(),
  requireAgreementLandlord,
  upload.single('contract'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Contract file required' });
      const result = await renewContract(req.params.id, req.file, req.user.id);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// 16. Propose contract amendment (restricted to ACTIVE status, max 10 amendments)
router.post('/:id/amend/propose', loadAgreement(), async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.status !== 'ACTIVE') {
      return res.status(422).json({ error: 'Contract must be ACTIVE to propose amendments' });
    }

    const count = await ContractAmendment.count({ where: { contractId: agreement.id } });
    if (count >= 10) {
      return res.status(422).json({ error: 'Maximum limit of 10 amendments reached' });
    }

    const { field, newValue, reason } = req.body;
    const allowedFields = ['monthlyRentIls', 'startDate', 'endDate', 'paymentDueDay'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ error: `Field must be one of: ${allowedFields.join(', ')}` });
    }

    if (newValue === undefined || newValue === null || String(newValue).trim() === '') {
      return res.status(400).json({ error: 'New value is required' });
    }

    let proposedBy = null;
    if (req.user.id === agreement.landlordId) {
      proposedBy = 'landlord';
    } else {
      const isTenant = await AgreementParty.findOne({
        where: { agreementId: agreement.id, userId: req.user.id, role: 'tenant' },
      });
      if (!isTenant) return res.status(403).json({ error: 'Forbidden' });
      proposedBy = 'tenant';
    }

    const amendment = await ContractAmendment.create({
      contractId: agreement.id,
      proposedBy,
      field,
      oldValue: String(agreement[field] !== undefined ? agreement[field] : ''),
      newValue: String(newValue),
      reason: reason || '',
      status: 'pending',
    });

    res.status(201).json(amendment);
  } catch (err) {
    next(err);
  }
});

// 17. Approve contract amendment
router.post('/:id/amend/:aId/approve', loadAgreement(), async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.status !== 'ACTIVE') {
      return res.status(422).json({ error: 'Contract must be ACTIVE to approve amendments' });
    }

    const amendment = await ContractAmendment.findByPk(req.params.aId);
    if (!amendment || amendment.contractId !== agreement.id) {
      return res.status(404).json({ error: 'Amendment not found' });
    }

    if (amendment.status !== 'pending') {
      return res.status(422).json({ error: 'Amendment is not pending approval' });
    }

    if (amendment.proposedBy === 'tenant') {
      if (req.user.id !== agreement.landlordId) {
        return res.status(403).json({ error: 'Only the landlord can approve this amendment' });
      }
    } else {
      const isTenant = await AgreementParty.findOne({
        where: { agreementId: agreement.id, userId: req.user.id, role: 'tenant' },
      });
      if (!isTenant) {
        return res.status(403).json({ error: 'Only the tenant can approve this amendment' });
      }
    }

    let castedValue = amendment.newValue;
    if (amendment.field === 'monthlyRentIls') {
      castedValue = parseFloat(amendment.newValue);
      if (isNaN(castedValue)) return res.status(400).json({ error: 'Invalid rent value' });
    } else if (amendment.field === 'paymentDueDay') {
      castedValue = parseInt(amendment.newValue, 10);
      if (isNaN(castedValue) || castedValue < 1 || castedValue > 31) {
        return res.status(400).json({ error: 'Invalid payment due day' });
      }
    }

    await agreement.update({ [amendment.field]: castedValue });
    await amendment.update({ status: 'approved' });

    res.json(amendment);
  } catch (err) {
    next(err);
  }
});

// 18. Reject contract amendment
router.post('/:id/amend/:aId/reject', loadAgreement(), async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    const amendment = await ContractAmendment.findByPk(req.params.aId);
    if (!amendment || amendment.contractId !== agreement.id) {
      return res.status(404).json({ error: 'Amendment not found' });
    }

    if (amendment.status !== 'pending') {
      return res.status(422).json({ error: 'Amendment is not pending' });
    }

    const isLandlord = req.user.id === agreement.landlordId;
    const isTenant = await AgreementParty.findOne({
      where: { agreementId: agreement.id, userId: req.user.id, role: 'tenant' },
    });
    if (!isLandlord && !isTenant) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await amendment.update({ status: 'rejected' });
    res.json(amendment);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
