const logger = require('../utils/logger');
const WhatsAppConversationState = require('../models/pg/WhatsAppConversationState');
const MaintenanceTicket = require('../models/pg/MaintenanceTicket');
const LedgerRow = require('../models/pg/LedgerRow');
const { User } = require('../models');
const waApi = require('./whatsappApiClient');
const { uploadFile, BUCKETS } = require('./r2Service');

async function getOrCreateState(phone) {
  let conv = await WhatsAppConversationState.findOne({ where: { phoneNumber: phone } });
  if (!conv) {
    conv = await WhatsAppConversationState.create({
      phoneNumber: phone,
      state: 'idle',
      context: {},
    });
  }
  return conv;
}

async function setConvState(conv, state, extraContext) {
  conv.state = state;
  conv.context = { ...conv.context, ...extraContext };
  await conv.save();
}

async function findUserByPhone(phone) {
  return User.findOne({ where: { phone }, attributes: ['id', 'firstName', 'lastName', 'role'] });
}

// ── Main Router ─────────────────────────────────────────────────────────────

async function route(phone, msg) {
  await waApi.markAsRead(msg.id);
  const conv = await getOrCreateState(phone);
  logger.debug(`[WA] ${phone} state=${conv.state} type=${msg.type}`);

  switch (conv.state) {
    case 'awaiting_payment_confirm':
      return handlePaymentConfirmation(conv, msg);
    case 'awaiting_maintenance_description':
      return handleMaintenanceDescription(conv, msg);
    case 'awaiting_maintenance_image':
      return handleMaintenanceImage(conv, msg);
    default:
      return handleIdle(phone, msg, conv);
  }
}

// ── Idle State ──────────────────────────────────────────────────────────────

async function handleIdle(phone, msg, conv) {
  const text = (msg.text?.body || '').trim().toLowerCase();

  if (text.includes('תשלום') || text.includes('שכר דירה')) {
    await waApi.sendInteractive({
      phoneNumber: phone,
      bodyText: 'שלום! מה תרצה לעשות בנוגע לתשלום?',
      buttons: [
        { id: 'payment_confirm', title: '✅ אישור תשלום' },
        { id: 'payment_status', title: '📊 סטטוס תשלום' },
      ],
    });
    return;
  }

  if (text.includes('תקלה') || text.includes('תחזוקה') || text.includes('בעיה')) {
    await waApi.sendText({ phoneNumber: phone, body: 'מצטערים לשמוע. תאר/י בקצרה את הבעיה.' });
    await setConvState(conv, 'awaiting_maintenance_description', {});
    return;
  }

  if (msg.type === 'interactive' && msg.interactive?.button_reply) {
    const btnId = msg.interactive.button_reply.id;
    if (btnId === 'payment_confirm') return startPaymentConfirmFlow(conv);
    if (btnId === 'payment_status') return sendPaymentStatus(conv);
    if (btnId === 'maintenance_open') return startMaintenanceFlow(conv);
  }

  await sendHelpMenu(phone);
}

async function sendHelpMenu(phone) {
  await waApi.sendText({
    phoneNumber: phone,
    body: 'שלום! אני הבוט של DirApp 🏠\n\n• *תשלום* — לאשר תשלום שכר דירה\n• *תקלה* — לדווח על תקלה בדירה\n• *עזרה* — לחזור לתפריט זה\n\nלכל שאלה נוספת: app.dirapp.co.il',
  });
}

// ── Payment Flow ────────────────────────────────────────────────────────────

async function startPaymentConfirmFlow(conv) {
  const amount = conv.context?.pendingAmount || 'סכום לא ידוע';
  await waApi.sendInteractive({
    phoneNumber: conv.phoneNumber,
    bodyText: `האם אתה מאשר ששילחת ${amount} ₪ שכר דירה לחודש הנוכחי?`,
    buttons: [
      { id: 'confirm_yes', title: '✅ כן, שילמתי' },
      { id: 'confirm_no', title: '❌ טרם שילמתי' },
    ],
  });
  await setConvState(conv, 'awaiting_payment_confirm', {});
}

async function handlePaymentConfirmation(conv, msg) {
  const btnId = msg.interactive?.button_reply?.id;
  if (btnId === 'confirm_yes') {
    logger.info(`Payment confirmed via WhatsApp: phone=${conv.phoneNumber}`);
    const ledgerRowId = conv.context?.ledgerRowId;
    if (ledgerRowId) {
      await LedgerRow.update(
        { status: 'REPORTED', reportedByTenant: new Date() },
        { where: { id: ledgerRowId, status: 'PENDING' } },
      );
    }
    await waApi.sendText({ phoneNumber: conv.phoneNumber, body: '✅ תודה! אישרנו את התשלום. ניתן לראות את הקבלה באפליקציה.' });
    await setConvState(conv, 'idle', { pendingAmount: undefined, ledgerRowId: undefined });
    return;
  }
  if (btnId === 'confirm_no') {
    await waApi.sendText({ phoneNumber: conv.phoneNumber, body: 'הבנו. כשתשלח/י את התשלום, שלח/י לנו הודעה ונעדכן את הסטטוס.' });
    await setConvState(conv, 'idle', { pendingAmount: undefined, ledgerRowId: undefined });
    return;
  }
  await waApi.sendText({ phoneNumber: conv.phoneNumber, body: 'לא הבנתי. האם שילחת את שכר הדירה? ענה/י "כן" או "לא".' });
}

async function sendPaymentStatus(conv) {
  const user = await findUserByPhone(conv.phoneNumber);
  if (!user) {
    await waApi.sendText({ phoneNumber: conv.phoneNumber, body: 'לא מצאנו חשבון משויך למספר הזה. הירשם/י באפליקציה.' });
    await setConvState(conv, 'idle', {});
    return;
  }
  const pending = await LedgerRow.findAll({
    where: { status: ['PENDING', 'OVERDUE'] },
    limit: 3,
    order: [['dueDate', 'ASC']],
  });
  if (!pending.length) {
    await waApi.sendText({ phoneNumber: conv.phoneNumber, body: '✅ אין תשלומים פתוחים כרגע.' });
  } else {
    const lines = pending.map((r) => `• ${r.period}: ₪${r.amount} (${r.status === 'OVERDUE' ? '⚠️ באיחור' : 'ממתין'})`);
    await waApi.sendText({ phoneNumber: conv.phoneNumber, body: `תשלומים פתוחים:\n${lines.join('\n')}` });
  }
  await setConvState(conv, 'idle', {});
}

// ── Maintenance Flow ────────────────────────────────────────────────────────

async function startMaintenanceFlow(conv) {
  await waApi.sendText({ phoneNumber: conv.phoneNumber, body: 'בטח, נפתח קריאת תחזוקה.\n\nתאר/י בקצרה את הבעיה (לדוגמה: "נזילה מהברז במטבח").' });
  await setConvState(conv, 'awaiting_maintenance_description', {});
}

async function handleMaintenanceDescription(conv, msg) {
  const description = (msg.text?.body || '').trim();
  if (!description || description.length < 5) {
    await waApi.sendText({ phoneNumber: conv.phoneNumber, body: 'הוסף/י קצת יותר פרטים על הבעיה כדי שנוכל לטפל בה.' });
    return;
  }
  await setConvState(conv, 'awaiting_maintenance_image', { maintenanceDescription: description });
  await waApi.sendText({ phoneNumber: conv.phoneNumber, body: 'תודה! יש לך תמונה של הבעיה? שלח/י תמונה, או הקלד/י *דלג* כדי להמשיך ללא תמונה.' });
}

async function handleMaintenanceImage(conv, msg) {
  let photoR2Key = null;

  if (msg.type === 'image' && msg.image) {
    try {
      const buf = await waApi.downloadMedia(msg.image.id);
      const key = `whatsapp/maintenance/${Date.now()}_${msg.image.id}.jpg`;
      await uploadFile(BUCKETS.CHECKIN_PHOTOS, key, buf, 'image/jpeg');
      photoR2Key = key;
      logger.info(`Maintenance image uploaded: ${key}`);
    } catch (err) {
      logger.warn(`Failed to download/upload maintenance image: ${err.message}`);
    }
  } else if ((msg.text?.body || '').toLowerCase().includes('דלג')) {
    // skip image
  } else {
    await waApi.sendText({ phoneNumber: conv.phoneNumber, body: 'שלח/י תמונה, או הקלד/י *דלג* כדי להמשיך ללא תמונה.' });
    return;
  }

  const user = await findUserByPhone(conv.phoneNumber);
  const description = conv.context.maintenanceDescription;
  const agreementId = conv.context.agreementId || null;

  let ticketNumber;
  if (user && agreementId) {
    const ticket = await MaintenanceTicket.create({
      agreementId,
      reporterId: user.id,
      description,
      photoR2Key,
      status: 'OPEN',
    });
    ticketNumber = ticket.id.slice(0, 8).toUpperCase();
  } else {
    ticketNumber = `MT-${Date.now().toString(36).toUpperCase()}`;
    logger.info(`WhatsApp maintenance ticket (unlinked): ${ticketNumber} — ${description}`);
  }

  await waApi.sendText({
    phoneNumber: conv.phoneNumber,
    body: `✅ קריאת תחזוקה נפתחה!\n\n🔖 מספר קריאה: *${ticketNumber}*\n📝 תיאור: ${description}\n\nנעדכן אותך כשיוקצה טכנאי.`,
  });
  await setConvState(conv, 'idle', { maintenanceDescription: undefined, agreementId: undefined });
}

module.exports = { route };
