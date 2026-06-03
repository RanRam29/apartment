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
    const { agreementId, description, sendWhatsapp } = req.body;
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

          // Send WhatsApp notification if requested and landlord has opted in
          const landlord = await models.User.findByPk(agreement.landlordId);
          const shouldSendWa = (sendWhatsapp === 'true' || sendWhatsapp === true) && landlord && landlord.whatsappOptIn && landlord.phone;
          if (shouldSendWa) {
            try {
              const waService = require('../services/whatsappNotificationService');
              const apartment = await models.Apartment.findByPk(agreement.propertyId);
              const addressStr = apartment ? (apartment.address || apartment.city || 'דירה ללא כתובת') : 'דירה ללא כתובת';
              await waService.sendMaintenanceOpened({
                phoneNumber: landlord.phone,
                ticketNumber: String(ticket.id),
                address: addressStr,
                contractId: agreementId,
                userId: agreement.landlordId,
              });
            } catch (waErr) {
              const logger = require('../utils/logger');
              logger.error(`Failed to send maintenance WA message: ${waErr.message}`);
            }
          }
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

// Landlord Dashboard V2 summary endpoint
router.get('/landlord/dashboard-v2', requireRole('landlord'), async (req, res, next) => {
  try {
    const landlordId = req.user.id;
    const { Apartment, Match, RentalAgreement, LedgerRow, User, MaintenanceTicket } = require('../models');
    const { Op } = require('sequelize');

    // 1. Active Listings
    const activeListings = await Apartment.count({
      where: { landlordId, isActive: true }
    });

    // 2. Active Contracts
    const activeContracts = await RentalAgreement.count({
      where: { landlordId, status: { [Op.in]: ['ACTIVE', 'EXPIRING'] } }
    });

    // 3. Pending Leads
    const pendingLeads = await Match.count({
      where: { landlordId, status: 'pending' }
    });

    // 4. Pending Payments (ledger rows that are PENDING, REPORTED, or OVERDUE for agreements owned by this landlord)
    const pendingPayments = await LedgerRow.count({
      include: [{
        model: RentalAgreement,
        as: 'agreement',
        where: { landlordId }
      }],
      where: {
        status: { [Op.in]: ['PENDING', 'REPORTED', 'OVERDUE'] }
      }
    });

    // 5. Open Maintenance Tickets
    const openTickets = await MaintenanceTicket.count({
      include: [{
        model: RentalAgreement,
        as: 'agreement',
        where: { landlordId }
      }],
      where: {
        status: { [Op.in]: ['OPEN', 'IN_PROGRESS', 'WAITING_INVOICE'] }
      }
    });

    // Mixed activity feed
    const [recentMatches, recentLedgerRows, recentTickets] = await Promise.all([
      Match.findAll({
        where: { landlordId },
        include: [
          { model: User, as: 'tenant', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
          { model: Apartment, as: 'apartment', attributes: ['id', 'title'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 10
      }),
      LedgerRow.findAll({
        include: [{
          model: RentalAgreement,
          as: 'agreement',
          where: { landlordId },
          include: [{ model: Apartment, as: 'apartment', attributes: ['id', 'title'] }]
        }],
        where: {
          status: { [Op.in]: ['REPORTED', 'OVERDUE'] }
        },
        order: [['updatedAt', 'DESC']],
        limit: 10
      }),
      MaintenanceTicket.findAll({
        include: [{
          model: RentalAgreement,
          as: 'agreement',
          where: { landlordId },
          include: [{ model: Apartment, as: 'apartment', attributes: ['id', 'title'] }]
        }],
        order: [['createdAt', 'DESC']],
        limit: 10
      })
    ]);

    // Format activities
    const activities = [];

    recentMatches.forEach(m => {
      activities.push({
        id: `match-${m.id}`,
        type: 'lead',
        title: m.status === 'accepted' ? 'התאמה אושרה' : 'ליד חדש משוכר',
        description: `${m.tenant?.firstName || ''} ${m.tenant?.lastName || ''} מעוניין/ת בדירה: ${m.apartment?.title || ''}`,
        date: m.createdAt,
        targetScreen: 'Leads',
        data: m
      });
    });

    recentLedgerRows.forEach(l => {
      const isOverdue = l.status === 'OVERDUE';
      activities.push({
        id: `ledger-${l.id}`,
        type: 'payment',
        title: isOverdue ? 'איחור בתשלום שכירות' : 'דיווח תשלום חדש',
        description: isOverdue 
          ? `תשלום עבור תקופה ${l.period} באיחור בדירה ${l.agreement?.apartment?.title || ''}`
          : `התקבל דיווח תשלום עבור תקופה ${l.period} בדירה ${l.agreement?.apartment?.title || ''}`,
        date: l.updatedAt || l.dueDate,
        targetScreen: 'Ledger',
        data: { ...l.toJSON(), agreementId: l.agreementId }
      });
    });

    recentTickets.forEach(t => {
      activities.push({
        id: `ticket-${t.id}`,
        type: 'ticket',
        title: `תקלה: ${t.status}`,
        description: `${t.description.substring(0, 80)}${t.description.length > 80 ? '...' : ''} בדירה ${t.agreement?.apartment?.title || ''}`,
        date: t.createdAt,
        targetScreen: 'Maintenance',
        data: t
      });
    });

    // Sort chronologically (newest first)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Landlord trust score
    const userObj = await User.findByPk(landlordId, { attributes: ['trustScore'] });

    res.json({
      metrics: {
        activeListings,
        activeContracts,
        pendingLeads,
        pendingPayments,
        openTickets
      },
      activities: activities.slice(0, 15),
      trustScore: userObj ? userObj.trustScore : 50
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
