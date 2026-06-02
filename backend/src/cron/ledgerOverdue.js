const { Op } = require('sequelize');
const { LedgerRow, User, AgreementParty } = require('../models');
const logger = require('../utils/logger');
const waNotify = require('../services/whatsappNotificationService');

async function runLedgerOverdue() {
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const dateStr = fiveDaysAgo.toISOString().split('T')[0];

  const overdueRows = await LedgerRow.findAll({
    where: { status: 'PENDING', dueDate: { [Op.lte]: dateStr } },
  });

  const [count] = await LedgerRow.update(
    { status: 'OVERDUE' },
    { where: { status: 'PENDING', dueDate: { [Op.lte]: dateStr } } }
  );

  for (const row of overdueRows) {
    const now = new Date();
    const dueDate = new Date(row.dueDate);
    const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));

    const tenants = await AgreementParty.findAll({ where: { agreementId: row.agreementId, role: 'tenant' } });
    for (const tp of tenants) {
      const user = await User.findByPk(tp.userId, { attributes: ['id', 'firstName', 'phone'] });
      if (user?.phone) {
        await waNotify.sendPaymentOverdue({
          phoneNumber: user.phone,
          tenantName: user.firstName,
          amount: String(row.amount),
          daysOverdue,
          contractId: row.agreementId,
          userId: user.id,
        }).catch((e) => logger.warn(`WA overdue failed: ${e.message}`));
      }
    }
  }

  if (count > 0) {
    logger.info(`LEDGER OVERDUE: Marked ${count} payments as OVERDUE`);
  }
}

module.exports = { runLedgerOverdue };
