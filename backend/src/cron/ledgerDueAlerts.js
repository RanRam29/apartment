const { LedgerRow, RentalAgreement } = require('../models');
const { notify } = require('../services/notificationService');

async function runLedgerDueAlerts() {
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
  const dateStr = fiveDaysFromNow.toISOString().split('T')[0];

  const rows = await LedgerRow.findAll({
    where: { dueDate: dateStr, status: 'PENDING' },
    include: [{ model: RentalAgreement, as: 'agreement' }],
  });

  for (const row of rows) {
    if (row.agreement) {
      await notify(row.agreement.landlordId, {
        title: 'תזכורת תשלום',
        body: `תשלום בסך ₪${row.amount} צפוי בעוד 5 ימים`,
      });
    }
  }
}

module.exports = { runLedgerDueAlerts };
