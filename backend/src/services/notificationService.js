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

module.exports = { notify, notifyMany };
