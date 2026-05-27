const { Op } = require('sequelize');
const { LedgerRow, RentalAgreement } = require('../models');

// CPI adjustment runs yearly. In production, fetch real CPI from CBS Israel API.
const ESTIMATED_CPI_RATE = 0.03; // 3% annual estimate

async function runCpiAdjustment() {
  const activeAgreements = await RentalAgreement.findAll({
    where: {
      status: { [Op.in]: ['ACTIVE', 'EXPIRING'] },
      cpiLinked: true,
    },
  });

  for (const agreement of activeAgreements) {
    const pendingRows = await LedgerRow.findAll({
      where: {
        agreementId: agreement.id,
        status: 'PENDING',
        cpiAdjustment: 0,
      },
    });

    for (const row of pendingRows) {
      const adjustment = parseFloat(row.amount) * ESTIMATED_CPI_RATE;
      await row.update({
        cpiAdjustment: adjustment.toFixed(2),
        amount: (parseFloat(row.amount) + adjustment).toFixed(2),
        notes: `CPI adjustment +${ESTIMATED_CPI_RATE * 100}%`,
      });
    }

    if (pendingRows.length > 0) {
      console.log(`CPI ADJUSTMENT: Updated ${pendingRows.length} rows for agreement ${agreement.id}`);
    }
  }
}

module.exports = { runCpiAdjustment };
