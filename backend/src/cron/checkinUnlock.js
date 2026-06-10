const { Op } = require('sequelize');
const { RentalAgreement } = require('../models');
const { notify } = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * Unlocks check-in protocol 48 hours (2 days) before start_date for SIGNED agreements.
 */
async function runCheckinUnlock() {
  const target = new Date();
  target.setDate(target.getDate() + 2);
  const targetStr = target.toISOString().split('T')[0];

  const agreements = await RentalAgreement.findAll({
    where: {
      status: 'SIGNED',
      startDate: targetStr,
      checkinUnlockedAt: { [Op.is]: null },
    },
  });

  const now = new Date();
  let notified = 0;

  for (const agreement of agreements) {
    await agreement.update({ checkinUnlockedAt: now });

    const userIds = [agreement.landlordId];
    if (agreement.tenantId) userIds.push(agreement.tenantId);

    const payload = {
      title: 'תיעוד כניסה זמין',
      body: 'תיעוד כניסה זמין — ניתן לצלם מחר',
      data: { agreementId: agreement.id, type: 'checkin_unlocked' },
    };

    for (const userId of userIds) {
      try {
        await notify(userId, payload);
        notified += 1;
      } catch (err) {
        logger.warn(`checkinUnlock notify failed for user ${userId}: ${err.message}`);
      }
    }

    logger.info(`CHECKIN UNLOCK: agreement ${agreement.id} — start ${targetStr}`);
  }

  return { unlocked: agreements.length, notified };
}

module.exports = { runCheckinUnlock };
