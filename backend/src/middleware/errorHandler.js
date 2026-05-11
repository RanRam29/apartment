const logger = require('../utils/logger');
const { logSystemEvent } = require('../services/systemEventService');
const { SYSTEM_CATEGORY, SYSTEM_SEVERITY } = require('../constants/logging');

function errorHandler(err, req, res, next) {
  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path || 'field';
    return res.status(409).json({ error: `${field} already exists` });
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    return res.status(422).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    return res.status(422).json({ error: err.message });
  }

  // Multer / contract upload
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'הקובץ גדול מדי (מקסימום 15MB)' });
  }
  if (err.code === 'INVALID_DOC_TYPE' || err.status === 415) {
    return res.status(415).json({ error: err.message || 'סוג קובץ לא נתמך' });
  }

  logger.error(`[${req.method}] ${req.path} →`, err);
  logSystemEvent({
    requestId: req.requestContext?.requestId,
    source: 'api',
    category: SYSTEM_CATEGORY.APPLICATION,
    severity: SYSTEM_SEVERITY.ERROR,
    event: 'request.error',
    message: `Unhandled error on ${req.method} ${req.path}`,
    actorId: req.user?.id || null,
    metadata: {
      status: err.status || err.statusCode || 500,
      name: err.name,
      error: err.message,
      path: req.path,
      method: req.method,
    },
  });

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

module.exports = { errorHandler };
