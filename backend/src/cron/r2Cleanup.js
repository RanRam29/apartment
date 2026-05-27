const { Op } = require('sequelize');
const { RentalAgreement } = require('../models');

async function runR2Cleanup() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Find ENDED contracts older than 6 months that could have archived files
  const oldContracts = await RentalAgreement.findAll({
    where: {
      status: 'ENDED',
      updatedAt: { [Op.lte]: sixMonthsAgo },
    },
    attributes: ['id', 'r2DocKey'],
  });

  console.log(`R2 CLEANUP: Found ${oldContracts.length} ended contracts older than 6 months`);
  // In production, move files to archive bucket or delete
}

module.exports = { runR2Cleanup };
