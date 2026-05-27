const { Op } = require('sequelize');
const { RentalAgreement, AgreementParty } = require('../models');

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

      // Notify landlord + tenants (notification service is CASCADE's domain, use console for now)
      const tenants = await AgreementParty.findAll({
        where: { agreementId: agreement.id, role: 'tenant' },
      });
      const userIds = [agreement.landlordId, ...tenants.map(t => t.userId)];
      console.log(`EXPIRING ALERT: ${days} days — agreement ${agreement.id} — notifying ${userIds.length} users`);
    }
  }
}

module.exports = { runExpiringAlerts };
