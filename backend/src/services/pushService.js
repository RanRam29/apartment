const axios = require('axios');
const logger = require('../utils/logger');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendPushNotification(pushToken, { title, body, data = {} }) {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) return;

  try {
    await axios.post(
      EXPO_PUSH_URL,
      { to: pushToken, title, body, data, sound: 'default', channelId: 'matches' },
      { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, timeout: 5000 }
    );
  } catch (err) {
    logger.warn('Push notification failed', { error: err.message });
  }
}

module.exports = { sendPushNotification };
