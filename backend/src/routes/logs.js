const express = require('express');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/security');
const { logSystemEvent } = require('../services/systemEventService');
const { logAudit } = require('../services/auditLogService');
const { SYSTEM_CATEGORY, AUDIT_ACTIONS } = require('../constants/logging');

const router = express.Router();

function tryDecodeUser(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

router.post('/client-event', async (req, res) => {
  const actor = tryDecodeUser(req);
  const {
    level = 'info',
    event = 'client.event',
    message = 'Client event',
    category = SYSTEM_CATEGORY.APPLICATION,
    metadata = {},
    tags = [],
  } = req.body || {};

  await logSystemEvent({
    requestId: req.requestContext?.requestId,
    source: 'client',
    category,
    severity: level,
    event,
    message,
    actorId: actor?.id || null,
    tags: Array.isArray(tags) ? tags : [],
    metadata: {
      ...metadata,
      path: req.path,
      platform: req.headers['x-client-platform'] || 'unknown',
    },
  });

  await logAudit({
    requestId: req.requestContext?.requestId,
    actorId: actor?.id || null,
    actorRole: actor?.role || null,
    action: AUDIT_ACTIONS.CLIENT_EVENT,
    resourceType: 'client',
    resourceId: null,
    statusCode: 202,
    outcome: 'success',
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
    route: req.path,
    method: req.method,
    metadata: {
      event,
      level,
      category,
      hasMetadata: Boolean(metadata && typeof metadata === 'object'),
    },
  });

  res.status(202).json({ accepted: true });
});

module.exports = router;
