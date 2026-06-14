const { LedgerRow } = require('../models');
const logger = require('../utils/logger');

/**
 * Seeds 12 monthly ledger rows when an agreement transitions to SIGNED.
 * Skips periods that already exist (idempotent).
 */
async function seedLedgerRows(agreement) {
  if (!agreement.startDate || !agreement.monthlyRentIls) {
    logger.warn(`seedLedgerRows skipped — missing startDate or monthlyRentIls on ${agreement.id}`);
    return [];
  }

  const start = new Date(agreement.startDate);
  const paymentDueDay = agreement.paymentDueDay || 1;
  const amount = agreement.monthlyRentIls;
  const created = [];

  for (let i = 0; i < 12; i++) {
    const periodDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const period = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;

    const existing = await LedgerRow.findOne({
      where: { agreementId: agreement.id, period },
    });
    if (existing) continue;

    const dueDateStr = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}-${String(paymentDueDay).padStart(2, '0')}`;

    try {
      const row = await LedgerRow.create({
        agreementId: agreement.id,
        period,
        dueDate: dueDateStr,
        amount,
        status: 'PENDING',
      });
      created.push(row);
    } catch (err) {
      // A concurrent seed already created this period's row — the unique
      // index on (agreement_id, period) is the source of truth (BUG-013).
      if (err.name === 'SequelizeUniqueConstraintError') continue;
      throw err;
    }
  }

  logger.info(`seedLedgerRows: created ${created.length} rows for agreement ${agreement.id}`);
  return created;
}

module.exports = { seedLedgerRows };
