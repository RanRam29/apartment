const { LedgerRow, RentalAgreement, User } = require('../models');
const { AgreementParty } = require('../models');
const logger = require('../utils/logger');
const waNotify = require('../services/whatsappNotificationService');
const { scheduleReminder } = require('../services/notificationService');

function ledgerDue3dDedupeKey(rowId) {
  return `ledger:${rowId}:due3d`;
}

async function scheduleLedgerDue3dReminder(row, user) {
  const fireAt = new Date();
  await scheduleReminder(
    user.id,
    fireAt,
    {
      title: 'תזכורת תשלום שכירות',
      body: `תשלום בסך ₪${row.amount} צפוי בעוד 3 ימים (${row.dueDate})`,
      data: {
        type: 'ledger_due_3d',
        ledgerRowId: row.id,
        agreementId: row.agreementId,
      },
    },
    { dedupeKey: ledgerDue3dDedupeKey(row.id) }
  ).catch((e) => logger.warn(`Scheduled T-3 reminder failed for ledger ${row.id}: ${e.message}`));
}

async function runLedgerDueAlerts() {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const dateStr3 = threeDaysFromNow.toISOString().split('T')[0];

  const todayStr = new Date().toISOString().split('T')[0];

  const rows3d = await LedgerRow.findAll({
    where: { dueDate: dateStr3, status: 'PENDING' },
    include: [{ model: RentalAgreement, as: 'agreement' }],
  });

  for (const row of rows3d) {
    const tenants = await AgreementParty.findAll({ where: { agreementId: row.agreementId, role: 'tenant' } });
    for (const tp of tenants) {
      const user = await User.findByPk(tp.userId, { attributes: ['id', 'firstName', 'phone'] });
      if (!user) continue;

      await scheduleLedgerDue3dReminder(row, user);

      if (user.phone) {
        await waNotify.sendPaymentReminder3Days({
          phoneNumber: user.phone,
          tenantName: user.firstName,
          amount: String(row.amount),
          dueDate: row.dueDate,
          contractId: row.agreementId,
          userId: user.id,
        }).catch((e) => logger.warn(`WA 3d reminder failed: ${e.message}`));
      }
    }
    logger.info(`LEDGER DUE ALERT: ₪${row.amount} due in 3 days — agreement ${row.agreementId}`);
  }

  const rowsToday = await LedgerRow.findAll({
    where: { dueDate: todayStr, status: 'PENDING' },
    include: [{ model: RentalAgreement, as: 'agreement' }],
  });

  for (const row of rowsToday) {
    const tenants = await AgreementParty.findAll({ where: { agreementId: row.agreementId, role: 'tenant' } });
    for (const tp of tenants) {
      const user = await User.findByPk(tp.userId, { attributes: ['id', 'firstName', 'phone'] });
      if (user?.phone) {
        await waNotify.sendPaymentReminderToday({
          phoneNumber: user.phone,
          tenantName: user.firstName,
          amount: String(row.amount),
          contractId: row.agreementId,
          userId: user.id,
        }).catch((e) => logger.warn(`WA today reminder failed: ${e.message}`));
      }
    }
    logger.info(`LEDGER DUE ALERT: ₪${row.amount} due today — agreement ${row.agreementId}`);
  }
}

module.exports = { runLedgerDueAlerts, ledgerDue3dDedupeKey, scheduleLedgerDue3dReminder };
