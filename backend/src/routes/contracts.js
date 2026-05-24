const express = require('express');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { Match, Apartment, User } = require('../models');
const RentalContract = require('../models/mongo/RentalContract');
const { contractDocumentUpload, resolveUploadFilePath, safeUnlinkUpload } = require('../services/contractUpload');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Standard contract template ───────────────────────────────────────────────
function buildContractText(contract) {
  const start = new Date(contract.startDate).toLocaleDateString('he-IL');
  const end   = new Date(contract.endDate).toLocaleDateString('he-IL');

  if (contract.uploadedDocumentFilename) {
    const fname = contract.uploadedDocumentOriginalName || 'מסמך';
    return `חוזה שכירות — קובץ שהועלה (${fname})

נערך ונחתם ביום ${new Date().toLocaleDateString('he-IL')}

בין: ${contract.landlordName} (להלן: "המשכיר")
לבין: ${contract.tenantName} (להלן: "השוכר")

הנכס: ${contract.apartmentTitle}
כתובת: ${contract.apartmentAddress}

תקופת השכירות (סיכום במערכת): מ-${start} עד ${end}.
דמי שכירות (סיכום במערכת): ₪${contract.monthlyRent.toLocaleString()} לחודש.
פיקדון (סיכום במערכת): ₪${contract.depositAmount.toLocaleString()} (${contract.depositMonths} חודשי שכירות).

הטקסט המלא של החוזה מופיע בקובץ PDF/Word שצורף. השתמשו בלחצן "צפה במסמך" באפליקציה.

${contract.customClauses ? `הערות / סעיפים נוספים:\n${contract.customClauses}\n` : ''}
חתימת המשכיר: ${contract.landlordSignedAt ? '✓ חתום' : '____________'}
חתימת השוכר:  ${contract.tenantSignedAt  ? '✓ חתום' : '____________'}
`;
  }

  return `חוזה שכירות מגורים

נערך ונחתם ביום ${new Date().toLocaleDateString('he-IL')}

בין: ${contract.landlordName} (להלן: "המשכיר")
לבין: ${contract.tenantName} (להלן: "השוכר")

הנכס: ${contract.apartmentTitle}
כתובת: ${contract.apartmentAddress}

1. תקופת השכירות: מ-${start} עד ${end}.
2. דמי השכירות: ₪${contract.monthlyRent.toLocaleString()} לחודש, לשלם עד ה-1 בכל חודש.
3. פיקדון: ₪${contract.depositAmount.toLocaleString()} (${contract.depositMonths} חודשי שכירות), יוחזר תוך 30 יום מסיום השכירות בניכוי נזקים.
4. השוכר לא יוכל להשכיר את הנכס בשכירות משנה ללא הסכמה בכתב מהמשכיר.
5. השוכר מתחייב להחזיר את הנכס במצב שקיבל אותו בניכוי בלאי סביר.
6. השוכר ישא בתשלומי ארנונה, חשמל, מים, גז וועד בית.
7. ביטול חד-צדדי יחייב הודעה מוקדמת של 60 יום.

${contract.customClauses ? `סעיפים נוספים:\n${contract.customClauses}\n` : ''}
חתימת המשכיר: ${contract.landlordSignedAt ? '✓ חתום' : '____________'}
חתימת השוכר:  ${contract.tenantSignedAt  ? '✓ חתום' : '____________'}
`;
}

function signedContractStatusExpression() {
  return {
    $cond: [
      {
        $and: [
          { $ne: ['$tenantSignedAt', null] },
          { $ne: ['$landlordSignedAt', null] },
        ],
      },
      'active',
      {
        $cond: [
          { $ne: ['$tenantSignedAt', null] },
          'pending_landlord',
          'pending_tenant',
        ],
      },
    ],
  };
}

function plainContract(c) {
  if (!c) return c;
  if (typeof c.toObject === 'function') return c.toObject();
  if (typeof c.toJSON === 'function') return c.toJSON();
  return { ...c };
}

/** Do not expose internal filename / mime in API; use hasUploadedDocument + attachment route */
function sanitizeContractForClient(doc) {
  const c = plainContract(doc);
  if (!c) return c;
  const has = !!c.uploadedDocumentFilename;
  const rest = { ...c };
  delete rest.uploadedDocumentFilename;
  delete rest.uploadedDocumentMimeType;
  return { ...rest, hasUploadedDocument: has };
}

// ─── POST /api/contracts — landlord creates a contract for an accepted match ──
router.post(
  '/',
  authenticate,
  requireRole('landlord'),
  [
    body('matchId').isUUID(),
    body('monthlyRent').isInt({ min: 100 }),
    body('depositMonths').optional().isInt({ min: 1, max: 6 }),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('customClauses').optional().isString().isLength({ max: 2000 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const { matchId, monthlyRent, depositMonths = 1, startDate, endDate, customClauses = '' } = req.body;

      const match = await Match.findOne({
        where: { id: matchId, landlordId: req.user.id, status: 'accepted' },
        include: [
          { model: Apartment, as: 'apartment', attributes: ['title', 'address', 'city', 'street'] },
          { model: User, as: 'tenant', attributes: ['firstName', 'lastName'] },
        ],
      });
      if (!match) return res.status(404).json({ error: 'Accepted match not found' });

      const existing = await RentalContract.findOne({ matchId, status: { $nin: ['terminated'] } });
      if (existing) return res.status(409).json({ error: 'Contract already exists for this match', contractId: existing._id });

      const landlord = await User.findByPk(req.user.id, { attributes: ['firstName', 'lastName'] });
      const apt = match.apartment;

      const depositAmount = monthlyRent * depositMonths;

      const contract = await RentalContract.create({
        matchId,
        tenantId:    match.tenantId,
        landlordId:  match.landlordId,
        apartmentId: match.apartmentId,
        monthlyRent: parseInt(monthlyRent),
        depositMonths,
        depositAmount,
        startDate: new Date(startDate),
        endDate:   new Date(endDate),
        customClauses,
        apartmentTitle:   apt.title,
        apartmentAddress: [apt.address, apt.street, apt.city].filter(Boolean).join(', '),
        tenantName:   `${match.tenant.firstName} ${match.tenant.lastName}`,
        landlordName: `${landlord.firstName} ${landlord.lastName}`,
        status: 'pending_tenant',
      });

      logger.info(`Contract created contractId=${contract._id} matchId=${matchId}`);
      res.status(201).json({
        contract: sanitizeContractForClient(contract),
        contractText: buildContractText(contract),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/contracts/upload — same as POST / but with PDF or Word file ──
router.post(
  '/upload',
  authenticate,
  requireRole('landlord'),
  contractDocumentUpload.single('document'),
  [
    body('matchId').isUUID(),
    body('monthlyRent').isInt({ min: 100 }),
    body('depositMonths').optional().isInt({ min: 1, max: 6 }),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('customClauses').optional().isString().isLength({ max: 2000 }),
  ],
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'נדרש קובץ (PDF או Word)' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        safeUnlinkUpload(req.file.path);
        return res.status(422).json({ errors: errors.array() });
      }

      const { matchId, monthlyRent, depositMonths = 1, startDate, endDate, customClauses = '' } = req.body;

      const match = await Match.findOne({
        where: { id: matchId, landlordId: req.user.id, status: 'accepted' },
        include: [
          { model: Apartment, as: 'apartment', attributes: ['title', 'address', 'city', 'street'] },
          { model: User, as: 'tenant', attributes: ['firstName', 'lastName'] },
        ],
      });
      if (!match) {
        safeUnlinkUpload(req.file.path);
        return res.status(404).json({ error: 'Accepted match not found' });
      }

      const existing = await RentalContract.findOne({ matchId, status: { $nin: ['terminated'] } });
      if (existing) {
        safeUnlinkUpload(req.file.path);
        return res.status(409).json({ error: 'Contract already exists for this match', contractId: existing._id });
      }

      const landlord = await User.findByPk(req.user.id, { attributes: ['firstName', 'lastName'] });
      const apt = match.apartment;

      const depositAmount = parseInt(monthlyRent, 10) * depositMonths;

      const contract = await RentalContract.create({
        matchId,
        tenantId: match.tenantId,
        landlordId: match.landlordId,
        apartmentId: match.apartmentId,
        monthlyRent: parseInt(monthlyRent, 10),
        depositMonths,
        depositAmount,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        customClauses,
        apartmentTitle: apt.title || '',
        apartmentAddress: [apt.address, apt.street, apt.city].filter(Boolean).join(', '),
        tenantName: `${match.tenant.firstName} ${match.tenant.lastName}`,
        landlordName: `${landlord.firstName} ${landlord.lastName}`,
        status: 'pending_tenant',
        uploadedDocumentFilename: req.file.filename,
        uploadedDocumentMimeType: req.file.mimetype,
        uploadedDocumentOriginalName: req.file.originalname || null,
      });

      logger.info(`Contract uploaded contractId=${contract._id} matchId=${matchId}`);
      res.status(201).json({
        contract: sanitizeContractForClient(contract),
        contractText: buildContractText(contract),
      });
    } catch (err) {
      if (req.file?.path) {
        safeUnlinkUpload(req.file.path);
      }
      next(err);
    }
  }
);

// ─── GET /api/contracts/:id/attachment — PDF/DOC (auth required) ─────────────
router.get('/:id/attachment', authenticate, async (req, res, next) => {
  try {
    const contract = await RentalContract.findById(req.params.id).lean();
    if (!contract?.uploadedDocumentFilename) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const isParty = contract.tenantId === req.user.id || contract.landlordId === req.user.id;
    if (!isParty) return res.status(403).json({ error: 'Access denied' });

    const filePath = resolveUploadFilePath(contract.uploadedDocumentFilename);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File missing on server' });
    }

    const mime = contract.uploadedDocumentMimeType || 'application/octet-stream';
    const original = contract.uploadedDocumentOriginalName || 'contract.pdf';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(original)}`);
    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/contracts — list own contracts ──────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const filter = req.user.role === 'landlord'
      ? { landlordId: req.user.id }
      : { tenantId: req.user.id };

    const contracts = await RentalContract.find(filter, { customClauses: 0 })
      .sort({ createdAt: -1 })
      .lean();

    const sanitized = contracts.map((c) => sanitizeContractForClient(c));
    res.json({ contracts: sanitized, total: sanitized.length });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/contracts/:id — contract detail + rendered text ─────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const contract = await RentalContract.findById(req.params.id).lean();
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const isParty = contract.tenantId === req.user.id || contract.landlordId === req.user.id;
    if (!isParty) return res.status(403).json({ error: 'Access denied' });

    res.json({
      contract: sanitizeContractForClient(contract),
      contractText: buildContractText(contract),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/contracts/:id/sign — e-sign by tenant or landlord ─────────────
router.post('/:id/sign', authenticate, async (req, res, next) => {
  try {
    const contract = await RentalContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const isTenant   = contract.tenantId   === req.user.id;
    const isLandlord = contract.landlordId === req.user.id;
    if (!isTenant && !isLandlord) return res.status(403).json({ error: 'Access denied' });

    if (contract.status === 'active') return res.status(409).json({ error: 'Contract already fully signed' });
    if (contract.status === 'terminated') return res.status(409).json({ error: 'Contract is terminated' });

    if (isTenant && contract.tenantSignedAt) return res.status(409).json({ error: 'Already signed' });
    if (isLandlord && contract.landlordSignedAt) return res.status(409).json({ error: 'Already signed' });

    const signedAt = new Date();
    const signedField = isTenant ? 'tenantSignedAt' : 'landlordSignedAt';
    const partyField = isTenant ? 'tenantId' : 'landlordId';
    const updateFilter = {
      _id: req.params.id,
      [partyField]: req.user.id,
      [signedField]: null,
      status: { $nin: ['active', 'terminated'] },
    };

    const updated = await RentalContract.findOneAndUpdate(
      updateFilter,
      [
        { $set: { [signedField]: signedAt } },
        { $set: { status: signedContractStatusExpression() } },
      ],
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ error: 'Contract signature state changed, please retry' });
    }
    logger.info(`Contract signed contractId=${contract._id} by ${req.user.role} userId=${req.user.id}`);
    res.json({
      contract: sanitizeContractForClient(updated),
      contractText: buildContractText(updated),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/contracts/:id/deposit — update deposit status ─────────────────
router.post(
  '/:id/deposit',
  authenticate,
  requireRole('landlord'),
  [body('action').isIn(['mark_paid', 'release', 'forfeit'])],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const contract = await RentalContract.findById(req.params.id);
      if (!contract) return res.status(404).json({ error: 'Contract not found' });
      if (contract.landlordId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

      const { action } = req.body;
      const now = new Date();
      const update = {};

      if (action === 'mark_paid') {
        update.depositStatus = 'held';
        update.depositPaidAt = now;
      } else if (action === 'release') {
        update.depositStatus = 'released';
        update.depositSettledAt = now;
      } else if (action === 'forfeit') {
        update.depositStatus = 'forfeited';
        update.depositSettledAt = now;
      }

      const updated = await RentalContract.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
      res.json({ contract: sanitizeContractForClient(updated) });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
