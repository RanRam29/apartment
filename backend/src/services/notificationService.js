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
 * Schedules a future notification. Persisted to scheduled_notifications;
 * cron/scheduledNotifications.js delivers due rows via notify().
 *
 * @param {string} userId
 * @param {Date|number} timestamp - when to send (Date or Unix ms)
 * @param {{ title: string, body: string, data?: object, emailSubject?: string, emailHtml?: string }} payload
 * @param {{ dedupeKey?: string }} [options] - idempotency key; scheduling the same key twice returns the existing row
 * @returns {Promise<object>} the ScheduledNotification record
 */
async function scheduleReminder(userId, timestamp, payload, options = {}) {
  const { ScheduledNotification } = require('../models');
  const fireAt = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(fireAt.getTime())) {
    throw new Error('scheduleReminder: invalid timestamp');
  }
  if (!payload || !payload.title || !payload.body) {
    throw new Error('scheduleReminder: payload.title and payload.body are required');
  }

  if (options.dedupeKey) {
    const [record] = await ScheduledNotification.findOrCreate({
      where: { dedupeKey: options.dedupeKey },
      defaults: { userId, fireAt, payload },
    });
    return record;
  }
  return ScheduledNotification.create({ userId, fireAt, payload });
}

/**
 * Cancels a pending scheduled notification by id or dedupeKey.
 * @returns {Promise<boolean>} true if a SCHEDULED row was cancelled
 */
async function cancelReminder({ id, dedupeKey }) {
  const { ScheduledNotification } = require('../models');
  const where = { status: 'SCHEDULED' };
  if (id) where.id = id;
  else if (dedupeKey) where.dedupeKey = dedupeKey;
  else throw new Error('cancelReminder: id or dedupeKey is required');

  const [count] = await ScheduledNotification.update({ status: 'CANCELLED' }, { where });
  return count > 0;
}

module.exports = { notify, notifyMany, scheduleReminder, cancelReminder };
