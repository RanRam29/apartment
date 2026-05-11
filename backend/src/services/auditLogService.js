const { AuditLog } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { sanitizeObject } = require('../utils/logSanitizer');
const { AUDIT_ACTIONS, AUDIT_OUTCOMES } = require('../constants/logging');

function toOutcome(outcome, statusCode) {
  if (outcome) return outcome;
  if (statusCode && statusCode >= 400) return AUDIT_OUTCOMES.FAILURE;
  return AUDIT_OUTCOMES.SUCCESS;
}

async function logAudit(event = {}) {
  const payload = {
    requestId: event.requestId || null,
    actorId: event.actorId || null,
    actorRole: event.actorRole || null,
    action: event.action || AUDIT_ACTIONS.RESOURCE_MUTATION,
    resourceType: event.resourceType || null,
    resourceId: event.resourceId || null,
    outcome: toOutcome(event.outcome, event.statusCode),
    statusCode: event.statusCode || null,
    ipAddress: event.ipAddress || null,
    userAgent: event.userAgent || null,
    route: event.route || null,
    method: event.method || null,
    metadata: sanitizeObject(event.metadata || {}),
  };

  try {
    await AuditLog.create(payload);
  } catch (err) {
    logger.warn(`Audit log write failed: ${err.message}`);
  }
}

async function cleanupOldAuditLogs(retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '180', 10)) {
  try {
    const cutoff = new Date(Date.now() - Math.max(1, retentionDays) * 24 * 60 * 60 * 1000);
    const deleted = await AuditLog.destroy({ where: { createdAt: { [Op.lt]: cutoff } } });
    return deleted;
  } catch (err) {
    logger.warn(`Audit retention cleanup failed: ${err.message}`);
    return 0;
  }
}

module.exports = { logAudit, cleanupOldAuditLogs };
