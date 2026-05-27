const { autoConfirmStalePayments } = require('../services/ledgerService');

async function runPaymentAutoConfirm() {
  const count = await autoConfirmStalePayments();
  if (count > 0) {
    console.log(`Auto-confirmed ${count} stale payments`);
  }
}

module.exports = { runPaymentAutoConfirm };
