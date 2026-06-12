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
    // MongoDB before first logSystemEvent so system_events does not buffer-timeout at startup
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
    await logSystemEvent({
      source: 'server',
      category: SYSTEM_CATEGORY.APPLICATION,
      severity: SYSTEM_SEVERITY.INFO,
      event: 'postgres.connected',
      message: 'PostgreSQL initialized successfully',
    });
    await autoSeed();
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
      try {
        const deleted = await cleanupOldAuditLogs();
        if (deleted > 0) {
          logger.info(`Audit retention cleanup removed ${deleted} rows`);
        }
      } catch (err) {
        logger.error(`Audit retention cleanup failed: ${err.message}`);
      }
    }, Math.max(1, cleanupHours) * 60 * 60 * 1000);
    initSocket(server);

    // Register cron jobs
    const cron = require('node-cron');
    const { runExpiringAlerts } = require('./cron/expiringAlerts');
    const { runLedgerDueAlerts } = require('./cron/ledgerDueAlerts');
    const { runLedgerOverdue } = require('./cron/ledgerOverdue');
    const { runPaymentAutoConfirm } = require('./cron/paymentAutoConfirm');
    const { runKycRenewal } = require('./cron/kycRenewal');
    const { runMaintenanceAlerts } = require('./cron/maintenanceAlerts');
    const { runR2Cleanup } = require('./cron/r2Cleanup');
    const { runCpiAdjustment } = require('./cron/cpiAdjustment');
    const { runCheckinUnlock } = require('./cron/checkinUnlock');
    const { runAccountDeletion } = require('./cron/accountDeletion');
    const { runScheduledNotifications } = require('./cron/scheduledNotifications');

    if (process.env.NODE_ENV !== 'test') {
      // A rejected cron run must never become an unhandled rejection (process crash risk)
      const safeCron = (name, fn) => () =>
        Promise.resolve()
          .then(fn)
          .catch((err) => logger.error(`Cron ${name} failed: ${err.message}`));
      cron.schedule('0 2 * * *', safeCron('accountDeletion', runAccountDeletion));
      cron.schedule('0 8 * * *', safeCron('ledgerDueAlerts', runLedgerDueAlerts));     // Daily 08:00
      cron.schedule('0 9 * * *', safeCron('expiringAlerts', runExpiringAlerts));       // Daily 09:00
      cron.schedule('0 9 * * *', safeCron('checkinUnlock', runCheckinUnlock));         // Daily 09:00 — unlock check-in 48h before start
      cron.schedule('59 23 * * *', safeCron('ledgerOverdue', runLedgerOverdue));       // Daily 23:59
      cron.schedule('0 * * * *', safeCron('paymentAutoConfirm', runPaymentAutoConfirm)); // Every hour
      cron.schedule('0 * * * *', safeCron('maintenanceAlerts', runMaintenanceAlerts)); // Every hour
      cron.schedule('0 0 * * *', safeCron('kycRenewal', runKycRenewal));               // Daily midnight
      cron.schedule('0 0 1 * *', safeCron('r2Cleanup', runR2Cleanup));                 // Monthly 1st
      cron.schedule('0 0 1 1 *', safeCron('cpiAdjustment', runCpiAdjustment));         // Jan 1 yearly
      cron.schedule('*/5 * * * *', safeCron('scheduledNotifications', runScheduledNotifications)); // Every 5 min
      logger.info('V3 platform cron jobs scheduled successfully');
    }
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

