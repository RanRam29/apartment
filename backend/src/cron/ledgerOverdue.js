const { Op } = require('sequelize');
const { LedgerRow } = require('../models');

async function runLedgerOverdue() {
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const dateStr = fiveDaysAgo.toISOString().split('T')[0];

  await LedgerRow.update(
    { status: 'OVERDUE' },
    { where: { status: 'PENDING', dueDate: { [Op.lte]: dateStr } } }
  );
}

module.exports = { runLedgerOverdue };
