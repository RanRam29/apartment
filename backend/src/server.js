require('dotenv').config();

const { getJwtSecret } = require('./config/security');
const logger = require('./utils/logger');

const requireJwtAtBoot =
  process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

if (requireJwtAtBoot) {
  try {
    getJwtSecret();
  } catch (err) {
    logger.error('FATAL: Cannot start API — JWT_SECRET is missing or invalid.');
    logger.error(err.message);
    logger.error(
      'Fix: Render → Web Service → Environment → add JWT_SECRET (≥20 chars). Blueprint uses generateValue; manual services must set it. Example: openssl rand -base64 32'
    );
    process.exit(1);
  }
}

const app = require('./app');
const { initPostgres } = require('./config/database');
const { initMongoDB } = require('./config/mongodb');
const { initRedis } = require('./config/redis');
const { initKafka } = require('./config/kafka');
const { initSocket } = require('./config/socket');
const { autoSeed } = require('./seeders/demo');
const { cleanupOldAuditLogs } = require('./services/auditLogService');
const { logSystemEvent } = require('./services/systemEventService');
const { SYSTEM_CATEGORY, SYSTEM_SEVERITY } = require('./constants/logging');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initPostgres();
    await logSystemEvent({
      source: 'server',
      category: SYSTEM_CATEGORY.APPLICATION,
      severity: SYSTEM_SEVERITY.INFO,
      event: 'postgres.connected',
      message: 'PostgreSQL initialized successfully',
    });
    await autoSeed();
    // MongoDB and Redis are soft dependencies — server starts even if unavailable
    await initMongoDB().catch((err) =>
      (logSystemEvent({
        source: 'server',
        category: SYSTEM_CATEGORY.INTEGRATION,
        severity: SYSTEM_SEVERITY.WARN,
        event: 'mongodb.unavailable',
        message: 'MongoDB unavailable, document-store features disabled',
        metadata: { error: err.message },
      }), logger.warn('MongoDB unavailable, document-store features disabled:', err.message))
    );
    await initRedis();
    // Kafka is optional — not available in free-tier deployments (Render, etc.)
    await initKafka().catch((err) =>
      (logSystemEvent({
        source: 'server',
        category: SYSTEM_CATEGORY.INTEGRATION,
        severity: SYSTEM_SEVERITY.WARN,
        event: 'kafka.unavailable',
        message: 'Kafka unavailable, running without event streaming',
        metadata: { error: err.message },
      }), logger.warn('Kafka unavailable, running without event streaming:', err.message))
    );

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logSystemEvent({
        source: 'server',
        category: SYSTEM_CATEGORY.APPLICATION,
        severity: SYSTEM_SEVERITY.INFO,
        event: 'server.started',
        message: `Server running on port ${PORT}`,
        metadata: { nodeEnv: process.env.NODE_ENV || 'development' },
      });
    });
    const cleanupHours = parseInt(process.env.AUDIT_RETENTION_CLEANUP_HOURS || '24', 10);
    setInterval(async () => {
      const deleted = await cleanupOldAuditLogs();
      if (deleted > 0) {
        logger.info(`Audit retention cleanup removed ${deleted} rows`);
      }
    }, Math.max(1, cleanupHours) * 60 * 60 * 1000);
    initSocket(server);
  } catch (err) {
    logger.error('Failed to start server:', err);
    await logSystemEvent({
      source: 'server',
      category: SYSTEM_CATEGORY.APPLICATION,
      severity: SYSTEM_SEVERITY.CRITICAL,
      event: 'server.start_failed',
      message: 'Failed to start server',
      metadata: { error: err.message },
    });
    process.exit(1);
  }
}

startServer();
