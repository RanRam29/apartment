const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { generateLedger, reportPayment, confirmPayment, rejectPayment } = require('../services/ledgerService');
const { LedgerRow } = require('../models');
const { uploadFile, BUCKETS } = require('../services/r2Service');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

// Get ledger for an agreement
router.get('/agreement/:agreementId', async (req, res, next) => {
  try {
    const rows = await LedgerRow.findAll({
      where: { agreementId: req.params.agreementId },
      order: [['dueDate', 'ASC']],
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Generate ledger (called when contract becomes ACTIVE)
router.post('/generate/:agreementId', requireRole('landlord'), async (req, res, next) => {
  try {
    const rows = await generateLedger(req.params.agreementId);
    res.status(201).json({ generated: rows.length });
  } catch (err) {
    next(err);
  }
});

// Tenant reports payment
router.post('/:id/report', upload.single('receipt'), async (req, res, next) => {
  try {
    let receiptKey = null;
    if (req.file) {
      receiptKey = `receipts/${req.params.id}/${Date.now()}-${req.file.originalname}`;
      await uploadFile(BUCKETS.PAYMENT_RECEIPTS, receiptKey, req.file.buffer, req.file.mimetype);
    }
    const row = await reportPayment(req.params.id, req.user.id, receiptKey);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

// Landlord confirms payment
router.post('/:id/confirm', requireRole('landlord'), async (req, res, next) => {
  try {
    const row = await confirmPayment(req.params.id);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

// Landlord rejects payment
router.post('/:id/reject', requireRole('landlord'), async (req, res, next) => {
  try {
    const row = await rejectPayment(req.params.id);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
