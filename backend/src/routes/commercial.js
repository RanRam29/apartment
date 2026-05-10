const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const CommercialLease = require('../models/mongo/CommercialLease');

const router = express.Router();

// Return critical dates within the next `days` days
function getUpcomingAlerts(lease, days = 90) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 86400000);
  const alerts = [];

  function check(date, type, label) {
    if (date && date >= now && date <= cutoff) {
      const daysLeft = Math.ceil((date - now) / 86400000);
      alerts.push({ type, label, date, daysLeft });
    }
  }

  check(lease.endDate,           'lease_end',        'תום חוזה');
  check(lease.renewalOptionDate, 'renewal_option',   'מועד אופציה לחידוש');
  check(lease.rentEscalationDate,'rent_escalation',  'עדכון שכר דירה');
  check(lease.inspectionDate,    'inspection',       'בדיקת נכס');

  // CAM reconciliation: fire 30 days before camReconciliationMonth each year
  if (lease.annualCamEstimate > 0) {
    const camMonth = (lease.camReconciliationMonth || 1) - 1;
    const camDate  = new Date(now.getFullYear(), camMonth, 1);
    if (camDate < now) camDate.setFullYear(camDate.getFullYear() + 1);
    const triggerDate = new Date(camDate.getTime() - 30 * 86400000);
    if (triggerDate >= now && triggerDate <= cutoff) {
      const daysLeft = Math.ceil((triggerDate - now) / 86400000);
      alerts.push({ type: 'cam_reconciliation', label: 'התחשבנות ועד בית (CAM)', date: triggerDate, daysLeft });
    }
  }

  alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  return alerts;
}

// POST /api/commercial — landlord creates commercial lease
router.post(
  '/',
  authenticate,
  [
    body('businessName').notEmpty().trim(),
    body('monthlyRent').isFloat({ min: 0 }),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('tenantId').notEmpty(),
    body('businessType').optional().isIn(['office','retail','warehouse','industrial','other']),
    body('annualCamEstimate').optional().isFloat({ min: 0 }),
    body('camReconciliationMonth').optional().isInt({ min: 1, max: 12 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
      if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Landlords only' });

      const { User } = require('../models');
      const [landlord, tenant] = await Promise.all([
        User.findByPk(req.user.id,        { attributes: ['firstName','lastName'] }),
        User.findByPk(req.body.tenantId,  { attributes: ['firstName','lastName'] }),
      ]);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      const lease = await CommercialLease.create({
        ...req.body,
        landlordId:   req.user.id,
        tenantName:   tenant  ? `${tenant.firstName} ${tenant.lastName}` : null,
        landlordName: landlord ? `${landlord.firstName} ${landlord.lastName}` : null,
        startDate: new Date(req.body.startDate),
        endDate:   new Date(req.body.endDate),
        renewalOptionDate:  req.body.renewalOptionDate  ? new Date(req.body.renewalOptionDate)  : undefined,
        rentEscalationDate: req.body.rentEscalationDate ? new Date(req.body.rentEscalationDate) : undefined,
        inspectionDate:     req.body.inspectionDate     ? new Date(req.body.inspectionDate)     : undefined,
      });

      res.status(201).json({ lease });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/commercial — list leases (role-filtered)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const filter = req.user.role === 'landlord'
      ? { landlordId: req.user.id }
      : { tenantId:   req.user.id };
    if (req.query.status) filter.status = req.query.status;
    const leases = await CommercialLease.find(filter).sort({ startDate: -1 }).limit(50);
    res.json({ leases });
  } catch (err) {
    next(err);
  }
});

// GET /api/commercial/:id — detail + alerts
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const lease = await CommercialLease.findById(req.params.id);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });
    const isParty = String(lease.landlordId) === String(req.user.id) ||
                    String(lease.tenantId)   === String(req.user.id);
    if (!isParty) return res.status(403).json({ error: 'Access denied' });

    const alerts = getUpcomingAlerts(lease, 90);
    res.json({ lease, alerts });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/commercial/:id — landlord updates lease fields
router.patch(
  '/:id',
  authenticate,
  [
    body('monthlyRent').optional().isFloat({ min: 0 }),
    body('annualCamEstimate').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['active','expired','terminated']),
  ],
  async (req, res, next) => {
    try {
      if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Landlords only' });
      const lease = await CommercialLease.findById(req.params.id);
      if (!lease) return res.status(404).json({ error: 'Lease not found' });
      if (String(lease.landlordId) !== String(req.user.id))
        return res.status(403).json({ error: 'Not your lease' });

      const allowed = [
        'businessName','businessType','monthlyRent','annualCamEstimate',
        'camReconciliationMonth','renewalOptionDate','renewalOptionMonths',
        'rentEscalationDate','rentEscalationPercent','inspectionDate',
        'propertyAddress','status','notes',
      ];
      allowed.forEach((k) => { if (req.body[k] !== undefined) lease[k] = req.body[k]; });
      await lease.save();
      res.json({ lease });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/commercial/:id/cam — add / update CAM reconciliation record
router.post(
  '/:id/cam',
  authenticate,
  [
    body('year').isInt({ min: 2000, max: 2100 }),
    body('actual').isFloat({ min: 0 }),
    body('notes').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Landlords only' });
      const lease = await CommercialLease.findById(req.params.id);
      if (!lease) return res.status(404).json({ error: 'Lease not found' });
      if (String(lease.landlordId) !== String(req.user.id))
        return res.status(403).json({ error: 'Not your lease' });

      const { year, actual, notes } = req.body;
      const existing = lease.camHistory.find((r) => r.year === Number(year));
      if (existing) {
        existing.actual     = actual;
        existing.difference = actual - (existing.estimated ?? lease.annualCamEstimate);
        existing.settledAt  = new Date();
        existing.notes      = notes;
      } else {
        lease.camHistory.push({
          year:       Number(year),
          estimated:  lease.annualCamEstimate,
          actual,
          difference: actual - lease.annualCamEstimate,
          settledAt:  new Date(),
          notes,
        });
      }
      await lease.save();
      res.json({ lease });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/commercial/:id/alerts — upcoming critical dates (default 90 days)
router.get('/:id/alerts', authenticate, async (req, res, next) => {
  try {
    const lease = await CommercialLease.findById(req.params.id);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });
    const isParty = String(lease.landlordId) === String(req.user.id) ||
                    String(lease.tenantId)   === String(req.user.id);
    if (!isParty) return res.status(403).json({ error: 'Access denied' });

    const days   = Number(req.query.days) || 90;
    const alerts = getUpcomingAlerts(lease, days);
    res.json({ alerts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
