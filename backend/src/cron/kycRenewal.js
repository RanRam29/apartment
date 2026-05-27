const { Op } = require('sequelize');
const { UserKycProfile } = require('../models');

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
    console.log(`KYC RENEWAL: Reset KYC for user ${kyc.userId}`);
  }
}

module.exports = { runKycRenewal };
