const { Op } = require('sequelize');
const { UserKycProfile } = require('../models');
const { notify } = require('../services/notificationService');

async function runKycRenewal() {
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const expiring = await UserKycProfile.findAll({
    where: {
      status: 'APPROVED',
      createdAt: { [Op.lte]: fiveYearsAgo },
    },
  });

  for (const kyc of expiring) {
    await kyc.update({ status: 'PENDING' });
    await notify(kyc.userId, {
      title: 'נדרש חידוש אימות זהות',
      body: 'אימות הזהות שלך פג תוקף. נא לבצע אימות חדש.',
    });
  }
}

module.exports = { runKycRenewal };
