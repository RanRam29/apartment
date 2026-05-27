const { LedgerRow, RentalAgreement } = require('../models');

const HEBREW_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

async function generateLedger(agreementId) {
  const agreement = await RentalAgreement.findByPk(agreementId);
  if (!agreement) throw new Error('Agreement not found');

  const start = new Date(agreement.startDate);
  const end = new Date(agreement.endDate);
  const paymentDay = agreement.paymentDueDay || 1;
  const monthlyRent = parseFloat(agreement.monthlyRentIls);

  const rows = [];
  const d = new Date(start);
  while (d < end) {
    const dueDate = new Date(d.getFullYear(), d.getMonth(), Math.min(paymentDay, 28));
    const period = `${HEBREW_MONTHS[d.getMonth()]} ${d.getFullYear()}`;

    rows.push({
      agreementId,
      period,
      dueDate: dueDate.toISOString().split('T')[0],
      amount: monthlyRent,
      status: 'PENDING',
    });

    d.setMonth(d.getMonth() + 1);
  }

  return LedgerRow.bulkCreate(rows);
}

async function reportPayment(ledgerRowId, tenantId, receiptR2Key) {
  const row = await LedgerRow.findByPk(ledgerRowId);
  if (!row) throw Object.assign(new Error('Ledger row not found'), { status: 404 });
  if (row.status === 'PAID') throw Object.assign(new Error('Already paid'), { status: 422 });

  await row.update({
    status: 'REPORTED',
    reportedByTenant: new Date(),
    receiptR2Key: receiptR2Key || null,
  });
  return row;
}

async function confirmPayment(ledgerRowId) {
  const row = await LedgerRow.findByPk(ledgerRowId);
  if (!row) throw Object.assign(new Error('Ledger row not found'), { status: 404 });

  await row.update({
    status: 'PAID',
    confirmedByLandlord: new Date(),
  });
  return row;
}

async function rejectPayment(ledgerRowId) {
  const row = await LedgerRow.findByPk(ledgerRowId);
  if (!row) throw Object.assign(new Error('Ledger row not found'), { status: 404 });

  await row.update({
    status: 'PENDING',
    reportedByTenant: null,
    receiptR2Key: null,
  });
  return row;
}

async function autoConfirmStalePayments() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const stale = await LedgerRow.findAll({
    where: {
      status: 'REPORTED',
      reportedByTenant: { [require('sequelize').Op.lt]: cutoff },
    },
  });

  for (const row of stale) {
    await row.update({ status: 'PAID', confirmedByLandlord: new Date(), notes: 'Auto-confirmed after 48h' });
  }
  return stale.length;
}

module.exports = { generateLedger, reportPayment, confirmPayment, rejectPayment, autoConfirmStalePayments };
