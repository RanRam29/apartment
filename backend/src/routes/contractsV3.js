const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadAndExtract, transitionState, validateGate } = require('../services/contractServiceV3');
const { RentalAgreement, AgreementParty, AgreementRoom, OwnershipVerification } = require('../models');
const { uploadFile, getPresignedUrl, BUCKETS } = require('../services/r2Service');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

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
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  }
);

router.get('/:id', async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id, {
      include: [
        { model: AgreementParty, as: 'parties' },
        { model: AgreementRoom, as: 'rooms' },
      ],
    });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    const docUrl = agreement.r2DocKey
      ? await getPresignedUrl(BUCKETS.CONTRACT_DOCS, agreement.r2DocKey)
      : null;

    res.json({ ...agreement.toJSON(), documentUrl: docUrl });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/fields', requireRole('landlord'), async (req, res, next) => {
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

router.post('/:id/invite-tenant', requireRole('landlord'), async (req, res, next) => {
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

router.get('/:id/validate', async (req, res, next) => {
  try {
    const result = await validateGate(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/transition', async (req, res, next) => {
  try {
    const { targetStatus } = req.body;
    const agreement = await transitionState(req.params.id, targetStatus);
    res.json(agreement);
  } catch (err) {
    if (err.reasons) return res.status(err.status || 422).json({ error: err.message, reasons: err.reasons });
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.post('/:id/sign', async (req, res, next) => {
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

    const allParties = await AgreementParty.findAll({ where: { agreementId: agreement.id } });
    const allSigned = allParties.every(p => p.signedAt) && agreement.landlordSignedAt;
    if (allSigned) {
      await agreement.update({ status: 'ACTIVE' });
    }

    res.json({ signed: true, allSigned, status: agreement.status });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/verify-ownership', async (req, res, next) => {
  try {
    const { choice } = req.body;
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

// --- Check-In Flow ---

router.post('/:id/checkin/:roomId/photos',
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
      for (const file of req.files) {
        const key = `checkin/${agreement.id}/${room.id}/${Date.now()}-${file.originalname}`;
        await uploadFile(BUCKETS.CHECKIN_PHOTOS, key, file.buffer, file.mimetype);
        photoKeys.push(key);
      }

      const existing = room.checkinPhotos || [];
      await room.update({ checkinPhotos: [...existing, ...photoKeys] });
      res.json({ uploaded: photoKeys.length, total: room.checkinPhotos.length });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/:id/checkin/complete', requireRole('landlord'), async (req, res, next) => {
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

// --- Check-Out Flow ---

router.post('/:id/checkout/:roomId/photos',
  upload.array('photos', 20),
  async (req, res, next) => {
    try {
      const room = await AgreementRoom.findByPk(req.params.roomId);
      if (!room || room.agreementId !== req.params.id) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const photoKeys = [];
      for (const file of req.files) {
        const key = `checkout/${req.params.id}/${room.id}/${Date.now()}-${file.originalname}`;
        await uploadFile(BUCKETS.CHECKOUT_PHOTOS, key, file.buffer, file.mimetype);
        photoKeys.push(key);
      }

      const existing = room.checkoutPhotos || [];
      await room.update({ checkoutPhotos: [...existing, ...photoKeys] });
      res.json({ uploaded: photoKeys.length });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/:id/checkout/review', requireRole('landlord'), async (req, res, next) => {
  try {
    const { roomId, notes, approved } = req.body;
    const room = await AgreementRoom.findByPk(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (!approved && notes) {
      await room.update({ checkoutNotes: notes, checkoutPhotos: [] });
      return res.json({ status: 'revision_requested', notes });
    }

    res.json({ status: 'approved' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/checkout/complete', async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    await agreement.update({ checkoutCompletedAt: new Date() });
    res.json({ checkoutCompleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
