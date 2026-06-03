const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');
const WhatsAppMessage = require('../models/pg/WhatsAppMessage');
const { route } = require('../services/whatsappRouter');

const router = express.Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'dirapp_verify_token';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

// ── GET /webhooks/whatsapp — Meta verification handshake ────────────────────

router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const challenge = req.query['hub.challenge'];
  const token = req.query['hub.verify_token'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified successfully');
    return res.status(200).send(challenge);
  }
  logger.warn(`WhatsApp webhook verification failed: mode=${mode}`);
  return res.status(403).json({ error: 'Verification failed' });
});

// ── POST /webhooks/whatsapp — Inbound messages + status updates ─────────────

router.post('/', async (req, res) => {
  // Always return 200 quickly — Meta retries on non-2xx
  res.status(200).json({ status: 'ok' });

  try {
    if (process.env.NODE_ENV === 'production') {
      const signature = req.headers['x-hub-signature-256'];
      if (!validateSignature(signature, req.rawBody)) {
        logger.warn('WhatsApp webhook: invalid signature');
        return;
      }
    }

    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        for (const message of value.messages || []) {
          await handleInboundMessage(message, value.contacts?.[0]);
        }

        for (const status of value.statuses || []) {
          await handleStatusUpdate(status);
        }
      }
    }
  } catch (err) {
    logger.error(`WhatsApp webhook processing error: ${err.message}`, err.stack);
  }
});

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleInboundMessage(message, contact) {
  const phone = `+${message.from}`;
  logger.info(`WA inbound from ${phone} type=${message.type}`);

  await WhatsAppMessage.create({
    phoneNumber: phone,
    wamid: message.id,
    direction: 'inbound',
    messageType: message.type || 'text',
    status: 'delivered',
    body: message.text?.body || null,
    payload: message,
  }).catch((err) => logger.warn(`Failed to log inbound WA message: ${err.message}`));

  try {
    await route(phone, message);
  } catch (err) {
    logger.error(`WA router error for ${phone}: ${err.message}`, err.stack);
  }
}

async function handleStatusUpdate(status) {
  const statusMap = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
  };
  const mapped = statusMap[status.status];
  if (!mapped) return;

  await WhatsAppMessage.update(
    {
      status: mapped,
      ...(status.errors ? { payload: { errors: status.errors } } : {}),
    },
    { where: { wamid: status.id } },
  ).catch((err) => logger.warn(`Failed to update WA message status: ${err.message}`));

  if (status.status === 'failed') {
    logger.warn(`WA message ${status.id} failed: ${JSON.stringify(status.errors)}`);
  }
}

// ── Signature validation ────────────────────────────────────────────────────

function validateSignature(signature, rawBody) {
  if (!signature || !APP_SECRET || !rawBody) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', APP_SECRET)
    .update(rawBody)
    .digest('hex')}`;

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
}

module.exports = router;
