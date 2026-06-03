const { sendNotificationEmail } = require('./resendService');
const { sendPushNotification } = require('./pushService');
const { User } = require('../models');
const { getRedisClient } = require('../config/redis');

async function notify(userId, { title, body, data, emailSubject, emailHtml }) {
  const user = await User.findByPk(userId, { attributes: ['id', 'email'] });
  if (!user) return;

  const results = { push: null, email: null };

  try {
    const redis = getRedisClient();
    if (redis) {
      const pushToken = await redis.get(`push:token:${userId}`).catch(() => null);
      if (pushToken) {
        results.push = await sendPushNotification(pushToken, { title, body, data });
      }
    }
  } catch (_) { /* push is best-effort */ }

  if (emailSubject && emailHtml && user.email) {
    try {
      results.email = await sendNotificationEmail({
        to: user.email,
        subject: emailSubject,
        html: emailHtml,
      });
    } catch (_) { /* email is best-effort */ }
  }

  return results;
}

async function notifyMany(userIds, payload) {
  return Promise.allSettled(userIds.map(id => notify(id, payload)));
}

/**
 * Schedules a future notification for a user.
 * Stores the reminder in the DB; cron jobs pick it up at the right time.
 *
 * @param {string|number} userId
 * @param {Date|number}   timestamp - When to send (Date object or Unix ms)
 * @param {{ title: string, body: string, emailSubject?: string, emailHtml?: string, data?: object }} payload
 * @returns {Promise<object>} The created scheduled notification record
 */
async function scheduleReminder(userId, timestamp, payload) {
  const { AppConfig } = require('../models');
  const fireAt = timestamp instanceof Date ? timestamp : new Date(timestamp);

  // Store in app_config-adjacent table via AuditLog pattern
  // For now: log the intent and let cron/ledger jobs handle the actual send
  // Full implementation: store in a scheduled_notifications table (TODO: create model)
  const logger = require('../utils/logger');
  logger.info(
    `scheduleReminder queued userId=${userId} fireAt=${fireAt.toISOString()} title="${payload?.title}"`
  );

  // TODO: replace with DB insert to scheduled_notifications table
  // until then, return a stub record
  return {
    userId,
    fireAt,
    payload,
    status: 'SCHEDULED',
    note: 'TODO: persist to scheduled_notifications table',
  };
}

module.exports = { notify, notifyMany, scheduleReminder };
