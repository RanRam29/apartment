const { logAudit } = require('../services/auditLogService');
const { AUDIT_ACTIONS } = require('../constants/logging');

function shouldCapture(req) {
  if (req.path === '/health') return false;
  if (req.path.startsWith('/api/admin/logs')) return false;
  return req.path.startsWith('/api/');
}

function inferResourceType(path = '') {
  if (path.includes('/auth')) return 'auth';
  if (path.includes('/apartments')) return 'apartment';
  if (path.includes('/matches')) return 'match';
  if (path.includes('/chat')) return 'chat';
  if (path.includes('/payments')) return 'payment';
  if (path.includes('/contracts')) return 'contract';
  return 'resource';
}

function auditCapture(req, res, next) {
  const startedAt = Date.now();
  res.on('finish', () => {
    if (!shouldCapture(req)) return;

    const ctx = req.getAuditContext ? req.getAuditContext() : {};
    logAudit({
      requestId: ctx.requestId,
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: AUDIT_ACTIONS.RESOURCE_MUTATION,
      resourceType: inferResourceType(req.path),
      resourceId: req.params?.id || null,
      statusCode: res.statusCode,
      outcome: res.statusCode >= 400 ? 'failure' : 'success',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      route: ctx.route,
      method: req.method,
      metadata: {
        durationMs: Date.now() - startedAt,
        query: ctx.query || {},
        isAuthenticated: Boolean(req.user?.id),
      },
    });
  });

  next();
}

module.exports = { auditCapture };
