const winston = require('winston');

const consoleFormat =
  process.env.NODE_ENV === 'production'
    ? winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    : winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.colorize({ all: true }),
        winston.format.printf((info) => {
          const { level, message, stack } = info;
          const base = typeof message === 'string' ? message : String(message ?? '');
          return stack ? `${level}: ${base}\n${stack}` : `${level}: ${base}`;
        })
      );

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: consoleFormat,
  transports: [new winston.transports.Console()],
});

function withRequestContext(req, meta = {}) {
  const requestId = req?.requestContext?.requestId || req?.headers?.['x-request-id'] || null;
  const actorId = req?.user?.id || null;
  return { ...meta, requestId, actorId };
}

logger.withRequestContext = withRequestContext;

module.exports = logger;
