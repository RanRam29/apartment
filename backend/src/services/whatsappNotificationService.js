const logger = require('../utils/logger');
const waApi = require('./whatsappApiClient');
const { TEMPLATES } = require('./whatsappTemplates');
const WhatsAppMessage = require('../models/pg/WhatsAppMessage');

async function sendAndLog(templateKey, { phoneNumber, userId, contractId, components }) {
  const template = TEMPLATES[templateKey];
  if (!template) {
    logger.error(`Unknown WhatsApp template: ${templateKey}`);
    return null;
  }

  let wamid;
  try {
    wamid = await waApi.sendTemplate({
      phoneNumber,
      templateName: template.name,
      languageCode: template.language,
      components,
    });
  } catch (err) {
    logger.error(`WhatsApp send failed (${templateKey}): ${err.message}`);
    await WhatsAppMessage.create({
      phoneNumber,
      direction: 'outbound',
      messageType: 'template',
      status: 'failed',
      templateName: template.name,
      payload: { templateKey, error: err.message },
      userId,
      contractId,
    }).catch(() => {});
    return null;
  }

  await WhatsAppMessage.create({
    phoneNumber,
    wamid,
    direction: 'outbound',
    messageType: 'template',
    status: 'sent',
    templateName: template.name,
    payload: { templateKey, components },
    userId,
    contractId,
  }).catch((err) => logger.warn(`Failed to log WA message: ${err.message}`));

  return wamid;
}

// ── Payment ─────────────────────────────────────────────────────────────────

async function sendPaymentReminder3Days({ phoneNumber, tenantName, amount, dueDate, contractId, userId }) {
  return sendAndLog('PAYMENT_REMINDER_3D', {
    phoneNumber, userId, contractId,
    components: TEMPLATES.PAYMENT_REMINDER_3D.buildComponents(tenantName, amount, dueDate),
  });
}

async function sendPaymentReminderToday({ phoneNumber, tenantName, amount, contractId, userId }) {
  return sendAndLog('PAYMENT_REMINDER_TODAY', {
    phoneNumber, userId, contractId,
    components: TEMPLATES.PAYMENT_REMINDER_TODAY.buildComponents(tenantName, amount),
  });
}

async function sendPaymentOverdue({ phoneNumber, tenantName, amount, daysOverdue, contractId, userId }) {
  return sendAndLog('PAYMENT_OVERDUE', {
    phoneNumber, userId, contractId,
    components: TEMPLATES.PAYMENT_OVERDUE.buildComponents(tenantName, amount, String(daysOverdue)),
  });
}

// ── Maintenance ─────────────────────────────────────────────────────────────

async function sendMaintenanceOpened({ phoneNumber, ticketNumber, address, contractId, userId }) {
  return sendAndLog('MAINTENANCE_OPENED', {
    phoneNumber, userId, contractId,
    components: TEMPLATES.MAINTENANCE_OPENED.buildComponents(ticketNumber, address),
  });
}

async function sendMaintenanceAssigned({ phoneNumber, technicianName, estimatedDate, contractId, userId }) {
  return sendAndLog('MAINTENANCE_ASSIGNED', {
    phoneNumber, userId, contractId,
    components: TEMPLATES.MAINTENANCE_ASSIGNED.buildComponents(technicianName, estimatedDate),
  });
}

async function sendMaintenanceResolved({ phoneNumber, ticketNumber, contractId, userId }) {
  return sendAndLog('MAINTENANCE_RESOLVED', {
    phoneNumber, userId, contractId,
    components: TEMPLATES.MAINTENANCE_RESOLVED.buildComponents(ticketNumber),
  });
}

// ── Contract / Invite ───────────────────────────────────────────────────────

async function sendTenantInvite({ phoneNumber, tenantName, landlordName, address, contractId, userId }) {
  return sendAndLog('TENANT_INVITE', {
    phoneNumber, userId, contractId,
    components: TEMPLATES.TENANT_INVITE.buildComponents(tenantName, landlordName, address),
  });
}

async function sendContractRenewal60Days({ phoneNumber, recipientName, expiryDate, address, contractId, userId }) {
  return sendAndLog('CONTRACT_RENEWAL_60D', {
    phoneNumber, userId, contractId,
    components: TEMPLATES.CONTRACT_RENEWAL_60D.buildComponents(recipientName, expiryDate, address),
  });
}

module.exports = {
  sendPaymentReminder3Days,
  sendPaymentReminderToday,
  sendPaymentOverdue,
  sendMaintenanceOpened,
  sendMaintenanceAssigned,
  sendMaintenanceResolved,
  sendTenantInvite,
  sendContractRenewal60Days,
};
