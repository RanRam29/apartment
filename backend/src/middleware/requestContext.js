const { v4: uuidv4 } = require('uuid');
const { sanitizeObject } = require('../utils/logSanitizer');

function requestContext(req, res, next) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  const startedAt = Date.now();
  const routeTemplate = req.route?.path || req.path;

  req.requestContext = {
    requestId,
    startedAt,
    ip: req.ip,
    userAgent: req.get('user-agent') || null,
    method: req.method,
    path: req.path,
    routeTemplate,
  };

  req.getAuditContext = function getAuditContext() {
    return {
      requestId,
      method: req.method,
      path: req.path,
      route: req.route?.path || routeTemplate,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      payload: sanitizeObject(req.body || {}),
      query: sanitizeObject(req.query || {}),
    };
  };

  res.setHeader('x-request-id', requestId);
  next();
}

module.exports = { requestContext };
