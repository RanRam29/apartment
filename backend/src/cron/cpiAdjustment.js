const { RentalAgreement } = require('../models');
const { Op } = require('sequelize');

async function runCpiAdjustment() {
  const activeAgreements = await RentalAgreement.findAll({
    where: { status: { [Op.in]: ['ACTIVE', 'EXPIRING'] }, cpiLinked: true },
  });

  // For MVP: placeholder — no actual adjustment without real CBS API data
  console.log(`CPI check: ${activeAgreements.length} CPI-linked agreements found`);
}

module.exports = { runCpiAdjustment };
