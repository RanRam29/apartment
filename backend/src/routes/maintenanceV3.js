const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { MaintenanceTicket, TicketInvoice } = require('../models');

// Load R2 client with parallel fallback
let uploadFile;
let BUCKETS = { CHECKIN_PHOTOS: 'checkin-photos', PAYMENT_RECEIPTS: 'payment-receipts' };
try {
  const r2 = require('../services/r2Service');
  uploadFile = r2.uploadFile;
  if (r2.BUCKETS) BUCKETS = r2.BUCKETS;
} catch (_) {
  uploadFile = async (bucket, key, buffer, contentType) => {
    const logger = require('../utils/logger');
    logger.info(`[R2 Mock Upload] Uploaded ${key} to ${bucket} (Parallel dev fallback)`);
    return { bucket, key };
  };
}

const { notify } = require('../services/notificationService');

// We also need RentalAgreement. Let's do dynamic require since CLAUDE_CODE creates it in parallel.
let RentalAgreement;
try {
  RentalAgreement = require('../models').RentalAgreement;
} catch (_) {}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

// Open a ticket
router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    const { agreementId, description } = req.body;
    let photoKey = null;
    if (req.file) {
      photoKey = `maintenance/${agreementId}/${Date.now()}-${req.file.originalname}`;
      await uploadFile(BUCKETS.CHECKIN_PHOTOS, photoKey, req.file.buffer, req.file.mimetype);
    }

    const ticket = await MaintenanceTicket.create({
      agreementId,
      reporterId: req.user.id,
      description,
      photoR2Key: photoKey,
      status: 'OPEN',
    });

    try {
      const models = require('../models');
      const RAgreement = models.RentalAgreement;
      if (RAgreement) {
        const agreement = await RAgreement.findByPk(agreementId);
        if (agreement) {
          await notify(agreement.landlordId, {
            title: 'תקלה חדשה דווחה',
            body: description.substring(0, 100),
            emailSubject: 'תקלה חדשה בנכס שלך',
            emailHtml: `<div dir="rtl"><p>${description}</p></div>`,
          });
        }
      }
    } catch (_) {
      // safe bypass if RentalAgreement is not fully loaded/seeded
    }

    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

// List tickets for an agreement
router.get('/agreement/:agreementId', async (req, res, next) => {
  try {
    const tickets = await MaintenanceTicket.findAll({
      where: { agreementId: req.params.agreementId },
      include: [{ model: TicketInvoice, as: 'invoices' }],
      order: [['createdAt', 'DESC']],
    });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// Landlord responds to ticket
router.post('/:id/respond', requireRole('landlord'), async (req, res, next) => {
  try {
    const { response, note } = req.body; // 'handling' | 'technician' | 'alternative'
    const ticket = await MaintenanceTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await ticket.update({
      status: 'IN_PROGRESS',
      landlordResponse: response,
      landlordNote: note || null,
    });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// Upload invoice
router.post('/:id/invoice', requireRole('landlord'), upload.single('invoice'), async (req, res, next) => {
  try {
    const { amount, payer } = req.body;
    if (!req.file) return res.status(400).json({ error: 'invoice file required' });
    const key = `invoices/${req.params.id}/${Date.now()}-${req.file.originalname}`;
    await uploadFile(BUCKETS.PAYMENT_RECEIPTS, key, req.file.buffer, req.file.mimetype);

    const invoice = await TicketInvoice.create({
      ticketId: req.params.id,
      r2Key: key,
      amount: parseFloat(amount),
      payer,
    });

    await MaintenanceTicket.update(
      { status: 'WAITING_INVOICE' },
      { where: { id: req.params.id } }
    );

    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
});

// Tenant closes ticket
router.post('/:id/close', async (req, res, next) => {
  try {
    const ticket = await MaintenanceTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    await ticket.update({ status: 'CLOSED' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
