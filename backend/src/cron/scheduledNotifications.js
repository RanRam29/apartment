const { Op } = require('sequelize');
const { ScheduledNotification } = require('../models');
const { notify } = require('../services/notificationService');
const logger = require('../utils/logger');

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 100;

/**
 * Delivers due scheduled notifications.
 * SCHEDULED + fireAt <= now → notify() → SENT.
 * On error: attempts++ and retried on the next run, FAILED after MAX_ATTEMPTS.
 */
async function runScheduledNotifications() {
  const due = await ScheduledNotification.findAll({
    where: {
      status: 'SCHEDULED',
      fireAt: { [Op.lte]: new Date() },
    },
    order: [['fireAt', 'ASC']],
    limit: BATCH_SIZE,
  });

  let sent = 0;
  let failed = 0;

  for (const row of due) {
    try {
      await notify(row.userId, row.payload);
      await row.update({ status: 'SENT', sentAt: new Date(), lastError: null });
      sent += 1;
    } catch (err) {
      const attempts = row.attempts + 1;
      const exhausted = attempts >= MAX_ATTEMPTS;
      await row.update({
        attempts,
        lastError: err.message,
        status: exhausted ? 'FAILED' : 'SCHEDULED',
      });
      failed += 1;
      logger.warn(
        `scheduledNotification ${row.id} delivery failed (attempt ${attempts}/${MAX_ATTEMPTS}): ${err.message}`
      );
    }
  }

  if (due.length > 0) {
    logger.info(`SCHEDULED NOTIFICATIONS: ${sent} sent, ${failed} failed of ${due.length} due`);
  }
  return { due: due.length, sent, failed };
}

module.exports = { runScheduledNotifications };
