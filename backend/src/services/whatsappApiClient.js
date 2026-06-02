const axios = require('axios');
const logger = require('../utils/logger');

const API_BASE = process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com';
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

let httpClient;
let phoneNumberId;

function getClient() {
  if (httpClient) return httpClient;

  const token = process.env.WHATSAPP_API_TOKEN;
  phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    logger.warn('WhatsApp API credentials not configured — messages will be logged only');
    return null;
  }

  httpClient = axios.create({
    baseURL: `${API_BASE}/${API_VERSION}`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  return httpClient;
}

function normalizePhone(phone) {
  return phone.replace(/^\+/, '');
}

async function post(payload) {
  const client = getClient();
  if (!client) {
    logger.info('[WhatsApp DRY-RUN] Would send:', JSON.stringify(payload).slice(0, 200));
    return { messages: [{ id: `dry_${Date.now()}` }] };
  }
  try {
    const { data } = await client.post(`/${phoneNumberId}/messages`, payload);
    return data;
  } catch (err) {
    const metaError = err.response?.data?.error;
    logger.error(`Meta API error: ${metaError?.code} — ${metaError?.message || err.message}`);
    throw err;
  }
}

async function sendTemplate({ phoneNumber, templateName, languageCode, components }) {
  const res = await post({
    messaging_product: 'whatsapp',
    to: normalizePhone(phoneNumber),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: components || [],
    },
  });
  return res.messages?.[0]?.id || '';
}

async function sendText({ phoneNumber, body }) {
  const res = await post({
    messaging_product: 'whatsapp',
    to: normalizePhone(phoneNumber),
    type: 'text',
    text: { body, preview_url: false },
  });
  return res.messages?.[0]?.id || '';
}

async function sendInteractive({ phoneNumber, bodyText, buttons }) {
  const res = await post({
    messaging_product: 'whatsapp',
    to: normalizePhone(phoneNumber),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((btn) => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title },
        })),
      },
    },
  });
  return res.messages?.[0]?.id || '';
}

async function markAsRead(wamid) {
  try {
    await post({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: wamid,
    });
  } catch (err) {
    logger.warn(`markAsRead failed for ${wamid}: ${err.message}`);
  }
}

async function downloadMedia(mediaId) {
  const client = getClient();
  if (!client) return Buffer.alloc(0);
  const { data: meta } = await client.get(`/${mediaId}`);
  const res = await client.get(meta.url, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

module.exports = {
  sendTemplate,
  sendText,
  sendInteractive,
  markAsRead,
  downloadMedia,
};
