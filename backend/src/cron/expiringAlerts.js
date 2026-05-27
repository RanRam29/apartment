const { Op } = require('sequelize');
const { RentalAgreement } = require('../models');
const { notifyMany } = require('../services/notificationService');

const ALERT_DAYS = [120, 90, 60, 45, 30];

async function runExpiringAlerts() {
  const now = new Date();

  for (const days of ALERT_DAYS) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + days);
    const dateStr = targetDate.toISOString().split('T')[0];

    const agreements = await RentalAgreement.findAll({
      where: {
        status: { [Op.in]: ['ACTIVE', 'EXPIRING'] },
        endDate: dateStr,
      },
    });

    for (const agreement of agreements) {
      if (agreement.status === 'ACTIVE' && days <= 120) {
        await agreement.update({ status: 'EXPIRING' });
      }

      const userIds = [agreement.landlordId];
      // Collect tenant IDs from agreement parties if any, or fall back to tenantId
      const { AgreementParty } = require('../models');
      if (AgreementParty) {
        const tenants = await AgreementParty.findAll({
          where: { agreementId: agreement.id, role: 'tenant' },
        });
        userIds.push(...tenants.map(t => t.userId));
      }

      await notifyMany(userIds, {
        title: 'חוזה מתקרב לסיום',
        body: `${days} ימים לסיום החוזה`,
        emailSubject: `התראה: ${days} ימים לסיום החוזה`,
        emailHtml: `<div dir="rtl"><p>החוזה שלך מסתיים בעוד ${days} ימים.</p></div>`,
      });
    }
  }
}

module.exports = { runExpiringAlerts };
