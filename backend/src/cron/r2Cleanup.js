const { Op } = require('sequelize');
const { RentalAgreement } = require('../models');
const { deleteFile, BUCKETS } = require('../services/r2Service');

async function runR2Cleanup() {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const expired = await RentalAgreement.findAll({
    where: {
      status: 'ENDED',
      endDate: { [Op.lte]: threeYearsAgo.toISOString().split('T')[0] },
      r2DocKey: { [Op.not]: null },
    },
  });

  for (const agreement of expired) {
    try {
      await deleteFile(BUCKETS.ARCHIVE, agreement.r2DocKey);
      await agreement.update({ r2DocKey: null });
    } catch (_) { /* best effort */ }
  }
}

module.exports = { runR2Cleanup };
