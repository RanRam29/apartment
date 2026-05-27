const { autoConfirmStalePayments } = require('../services/ledgerService');

async function runPaymentAutoConfirm() {
  const count = await autoConfirmStalePayments();
  if (count > 0) {
    console.log(`AUTO-CONFIRM: Auto-confirmed ${count} stale payments after 48h`);
  }
}

module.exports = { runPaymentAutoConfirm };
