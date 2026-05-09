const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const IoTDevice = require('../models/mongo/IoTDevice');
const MaintenanceTicket = require('../models/mongo/MaintenanceTicket');
const CommercialLease = require('../models/mongo/CommercialLease');

const router = express.Router();

// Helper: verify caller is a party (tenant or landlord) to the given lease
async function isPartyToLease(userId, leaseId) {
  const lease = await CommercialLease.findById(leaseId).lean();
  if (!lease) return null;
  const isParty =
    String(lease.landlordId) === String(userId) ||
    String(lease.tenantId)   === String(userId);
  return isParty ? lease : null;
}

// ─── POST /api/iot/devices — landlord registers device ───────────────────────
router.post(
  '/devices',
  authenticate,
  [
    body('leaseId').notEmpty(),
    body('tenantId').notEmpty(),
    body('deviceId').notEmpty(),
    body('name').notEmpty().trim(),
    body('type').isIn(['access_control', 'sensor', 'camera', 'meter', 'other']),
    body('location').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
      if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Landlords only' });

      const lease = await isPartyToLease(req.user.id, req.body.leaseId);
      if (!lease) return res.status(404).json({ error: 'Lease not found or access denied' });

      const device = await IoTDevice.create({
        leaseId:    req.body.leaseId,
        landlordId: req.user.id,
        tenantId:   req.body.tenantId,
        deviceId:   req.body.deviceId,
        name:       req.body.name,
        type:       req.body.type,
        location:   req.body.location,
        metadata:   req.body.metadata,
      });

      res.status(201).json({ device });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: 'Device ID already registered' });
      next(err);
    }
  }
);

// ─── GET /api/iot/devices — list devices for leases caller is party to ────────
router.get('/devices', authenticate, async (req, res, next) => {
  try {
    const filter = req.user.role === 'landlord'
      ? { landlordId: req.user.id }
      : { tenantId:   req.user.id };
    if (req.query.leaseId) filter.leaseId = req.query.leaseId;

    const devices = await IoTDevice.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ devices });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/iot/devices/:deviceId/status — update status / heartbeat ─────
router.patch(
  '/devices/:deviceId/status',
  authenticate,
  [
    body('status').optional().isIn(['online', 'offline', 'maintenance']),
  ],
  async (req, res, next) => {
    try {
      const device = await IoTDevice.findOne({ deviceId: req.params.deviceId });
      if (!device) return res.status(404).json({ error: 'Device not found' });

      // Must be party to the lease
      const lease = await isPartyToLease(req.user.id, device.leaseId);
      if (!lease) return res.status(403).json({ error: 'Access denied' });

      if (req.body.status) device.status = req.body.status;
      device.lastSeenAt = new Date();
      await device.save();

      res.json({ device });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/iot/maintenance — create maintenance ticket ───────────────────
router.post(
  '/maintenance',
  authenticate,
  [
    body('leaseId').notEmpty(),
    body('title').notEmpty().trim(),
    body('description').optional().trim(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('deviceId').optional(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const lease = await isPartyToLease(req.user.id, req.body.leaseId);
      if (!lease) return res.status(404).json({ error: 'Lease not found or access denied' });

      const { User } = require('../models');
      const reporter = await User.findByPk(req.user.id, { attributes: ['firstName', 'lastName'] });

      const ticket = await MaintenanceTicket.create({
        leaseId:      req.body.leaseId,
        deviceId:     req.body.deviceId,
        reporterId:   req.user.id,
        reporterName: reporter ? `${reporter.firstName} ${reporter.lastName}` : null,
        title:        req.body.title,
        description:  req.body.description,
        priority:     req.body.priority || 'medium',
      });

      res.status(201).json({ ticket });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/iot/maintenance — list tickets (role-filtered) ─────────────────
router.get('/maintenance', authenticate, async (req, res, next) => {
  try {
    // Build a filter that only returns tickets for leases where caller is a party
    const leaseFilter = req.user.role === 'landlord'
      ? { landlordId: req.user.id }
      : { tenantId:   req.user.id };
    if (req.query.leaseId) leaseFilter._id = req.query.leaseId;

    const leases = await CommercialLease.find(leaseFilter).select('_id').lean();
    const leaseIds = leases.map((l) => String(l._id));

    const ticketFilter = { leaseId: { $in: leaseIds } };
    if (req.query.status) ticketFilter.status = req.query.status;

    const tickets = await MaintenanceTicket.find(ticketFilter).sort({ createdAt: -1 }).limit(100);
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/iot/maintenance/:id — update ticket status/resolution ─────────
router.patch(
  '/maintenance/:id',
  authenticate,
  [
    body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']),
    body('resolutionNotes').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const ticket = await MaintenanceTicket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

      // Verify access
      const lease = await isPartyToLease(req.user.id, ticket.leaseId);
      if (!lease) return res.status(403).json({ error: 'Access denied' });

      // Only landlord may resolve/close
      if (['resolved', 'closed'].includes(req.body.status) && req.user.role !== 'landlord') {
        return res.status(403).json({ error: 'Only landlord can resolve or close tickets' });
      }

      if (req.body.status) ticket.status = req.body.status;
      if (req.body.resolutionNotes !== undefined) ticket.resolutionNotes = req.body.resolutionNotes;

      if (req.body.status === 'resolved' && !ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
        ticket.resolvedBy = req.user.id;
      }

      await ticket.save();
      res.json({ ticket });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/iot/access — simulate access event ────────────────────────────
router.post(
  '/access',
  authenticate,
  [
    body('deviceId').notEmpty(),
    body('action').isIn(['unlock', 'lock']),
    body('grantedTo').optional(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const device = await IoTDevice.findOne({ deviceId: req.body.deviceId });
      if (!device) return res.status(404).json({ error: 'Device not found' });
      if (device.type !== 'access_control') return res.status(400).json({ error: 'Device is not an access control device' });

      // Must be party to the lease
      const lease = await isPartyToLease(req.user.id, device.leaseId);
      if (!lease) return res.status(403).json({ error: 'Access denied' });

      device.lastSeenAt = new Date();
      device.status = 'online';
      await device.save();

      res.json({
        granted: true,
        timestamp: device.lastSeenAt.toISOString(),
        deviceId: device.deviceId,
        action: req.body.action,
        grantedTo: req.body.grantedTo ?? req.user.id,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
