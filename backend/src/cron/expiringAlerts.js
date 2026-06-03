const { Op } = require('sequelize');
const { RentalAgreement, AgreementParty, User } = require('../models');
const logger = require('../utils/logger');
const waNotify = require('../services/whatsappNotificationService');

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

      const tenants = await AgreementParty.findAll({
        where: { agreementId: agreement.id, role: 'tenant' },
      });
      const userIds = [agreement.landlordId, ...tenants.map(t => t.userId)];

      if (days === 60) {
        for (const uid of userIds) {
          const user = await User.findByPk(uid, { attributes: ['id', 'firstName', 'phone'] });
          if (user?.phone) {
            await waNotify.sendContractRenewal60Days({
              phoneNumber: user.phone,
              recipientName: user.firstName,
              expiryDate: agreement.endDate,
              address: agreement.address || '',
              contractId: agreement.id,
              userId: user.id,
            }).catch((e) => logger.warn(`WA renewal 60d failed: ${e.message}`));
          }
        }
      }

      logger.info(`EXPIRING ALERT: ${days} days — agreement ${agreement.id} — notifying ${userIds.length} users`);
    }
  }
}

module.exports = { runExpiringAlerts };
