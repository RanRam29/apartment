const express = require('express');
const { Op } = require('sequelize');
const { authenticate, requireRole } = require('../middleware/auth');
const { AuditLog } = require('../models');
const SystemEvent = require('../models/mongo/SystemEvent');
const { logAudit } = require('../services/auditLogService');
const { AUDIT_ACTIONS } = require('../constants/logging');

const router = express.Router();

function parseLimit(raw, fallback = 50, max = 200) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, n);
}

router.use(authenticate, requireRole('admin'));

router.get('/audit', async (req, res, next) => {
  try {
    const limit = parseLimit(req.query.limit, 50);
    const offset = parseLimit(req.query.offset, 0, 1000000);
    const where = {};
    const andConditions = [];

    if (req.query.actorId) where.actorId = req.query.actorId;
    if (req.query.action) where.action = req.query.action;
    if (req.query.resourceType) where.resourceType = req.query.resourceType;
    if (req.query.outcome) where.outcome = req.query.outcome;
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt[Op.gte] = new Date(req.query.from);
      if (req.query.to) where.createdAt[Op.lte] = new Date(req.query.to);
    }
    if (req.query.search) {
      const search = `%${String(req.query.search).trim()}%`;
      andConditions.push({
        [Op.or]: [
          { action: { [Op.iLike]: search } },
          { resourceType: { [Op.iLike]: search } },
          { resourceId: { [Op.iLike]: search } },
          { requestId: { [Op.iLike]: search } },
          { route: { [Op.iLike]: search } },
          { method: { [Op.iLike]: search } },
        ],
      });
    }
    if (andConditions.length) {
      where[Op.and] = andConditions;
    }

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    await logAudit({
      requestId: req.requestContext?.requestId,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: AUDIT_ACTIONS.ADMIN_LOGS_READ,
      resourceType: 'audit_log',
      outcome: 'success',
      statusCode: 200,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      route: req.path,
      method: req.method,
      metadata: { query: req.query, count },
    });

    res.json({ items: rows, total: count, limit, offset });
  } catch (err) {
    next(err);
  }
});

router.get('/system', async (req, res, next) => {
  try {
    const limit = parseLimit(req.query.limit, 50);
    const skip = parseLimit(req.query.offset, 0, 1000000);
    const filter = {};

    if (req.query.severity) filter.severity = String(req.query.severity);
    if (req.query.category) filter.category = String(req.query.category);
    if (req.query.source) filter.source = String(req.query.source);
    if (req.query.actorId) filter.actorId = String(req.query.actorId);
    if (req.query.event) filter.event = String(req.query.event);
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }
    if (req.query.search) {
      const search = String(req.query.search).trim();
      if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [
          { event: regex },
          { message: regex },
          { source: regex },
          { requestId: regex },
          { actorId: regex },
        ];
      }
    }

    const [items, total] = await Promise.all([
      SystemEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SystemEvent.countDocuments(filter),
    ]);

    await logAudit({
      requestId: req.requestContext?.requestId,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: AUDIT_ACTIONS.ADMIN_LOGS_READ,
      resourceType: 'system_event',
      outcome: 'success',
      statusCode: 200,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      route: req.path,
      method: req.method,
      metadata: { query: req.query, total },
    });

    res.json({ items, total, limit, offset: skip });
  } catch (err) {
    next(err);
  }
});

router.get('/audit/export.csv', async (req, res, next) => {
  try {
    const limit = parseLimit(req.query.limit, 500, 5000);
    const rows = await AuditLog.findAll({
      order: [['createdAt', 'DESC']],
      limit,
    });
    const header = 'id,createdAt,actorId,action,resourceType,resourceId,outcome,statusCode,requestId';
    const lines = rows.map((row) => {
      const r = row.toJSON();
      return [
        r.id,
        r.createdAt,
        r.actorId || '',
        r.action,
        r.resourceType || '',
        r.resourceId || '',
        r.outcome,
        r.statusCode || '',
        r.requestId || '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send([header, ...lines].join('\n'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
