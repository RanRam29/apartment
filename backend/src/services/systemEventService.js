const logger = require('../utils/logger');
const { sanitizeObject, sanitizeString } = require('../utils/logSanitizer');
const { SYSTEM_CATEGORY, SYSTEM_SEVERITY } = require('../constants/logging');

let SystemEventModel = null;
try {
  SystemEventModel = require('../models/mongo/SystemEvent');
} catch {
  SystemEventModel = null;
}

async function logSystemEvent(event = {}) {
  const payload = {
    requestId: event.requestId || null,
    source: event.source || 'api',
    category: event.category || SYSTEM_CATEGORY.APPLICATION,
    severity: event.severity || SYSTEM_SEVERITY.INFO,
    event: event.event || 'unknown_event',
    message: sanitizeString(event.message || 'System event'),
    actorId: event.actorId || null,
    tags: Array.isArray(event.tags) ? event.tags : [],
    metadata: sanitizeObject(event.metadata || {}),
  };

  if (!SystemEventModel) return;

  try {
    await SystemEventModel.create(payload);
  } catch (err) {
    logger.warn(`System event write failed: ${err.message}`);
  }
}

module.exports = { logSystemEvent };
