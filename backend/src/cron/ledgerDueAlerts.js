const { LedgerRow, RentalAgreement } = require('../models');

async function runLedgerDueAlerts() {
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
  const dateStr = fiveDaysFromNow.toISOString().split('T')[0];

  const rows = await LedgerRow.findAll({
    where: { dueDate: dateStr, status: 'PENDING' },
    include: [{ model: RentalAgreement, as: 'agreement' }],
  });

  for (const row of rows) {
    console.log(`LEDGER DUE ALERT: ₪${row.amount} due in 5 days — agreement ${row.agreementId}`);
  }
}

module.exports = { runLedgerDueAlerts };
