const { Op } = require('sequelize');
const {
  User,
  LedgerRow,
  RentalAgreement,
  AgreementParty,
  AgreementRoom,
  MaintenanceTicket,
  AppConfig,
} = require('../models');
const logger = require('../utils/logger');

const SCORE = {
  OVERDUE_PENALTY: 5,
  ON_TIME_BONUS: 2,
  CLEAN_CHECKOUT_BONUS: 5,
  MAINTENANCE_HANDLED_BONUS: 2,
};

function clampScore(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function isPaidOnTime(row) {
  if (row.status !== 'PAID' || !row.confirmedByLandlord) return false;
  const paidAt = new Date(row.confirmedByLandlord);
  const dueEnd = new Date(`${row.dueDate}T23:59:59.999`);
  return paidAt <= dueEnd;
}

async function getBaseScore() {
  const row = await AppConfig.findByPk('initial_trust_score');
  const parsed = parseInt(row?.value, 10);
  return Number.isFinite(parsed) ? parsed : 50;
}

async function getMaxScore() {
  const row = await AppConfig.findByPk('max_trust_score');
  const parsed = parseInt(row?.value, 10);
  return Number.isFinite(parsed) ? parsed : 100;
}

/**
 * Recomputes users.trustScore from ledger, checkout, and maintenance history.
 * @returns {Promise<number|null>} clamped score, or null if user missing
 */
async function recalcTrustScore(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  let score = await getBaseScore();
  const maxScore = await getMaxScore();

  const tenantAgreementIds = (
    await AgreementParty.findAll({
      where: { userId, role: 'tenant' },
      attributes: ['agreementId'],
    })
  ).map((p) => p.agreementId);

  if (tenantAgreementIds.length > 0) {
    const ledgerRows = await LedgerRow.findAll({
      where: { agreementId: { [Op.in]: tenantAgreementIds } },
    });

    for (const row of ledgerRows) {
      if (row.status === 'OVERDUE') score -= SCORE.OVERDUE_PENALTY;
      if (isPaidOnTime(row)) score += SCORE.ON_TIME_BONUS;
    }

    const completedCheckouts = await RentalAgreement.findAll({
      where: {
        id: { [Op.in]: tenantAgreementIds },
        checkoutCompletedAt: { [Op.ne]: null },
      },
      attributes: ['id'],
    });

    for (const agreement of completedCheckouts) {
      const rooms = await AgreementRoom.findAll({
        where: { agreementId: agreement.id },
        attributes: ['checkoutNotes'],
      });
      const hasDamageNotes = rooms.some((r) => String(r.checkoutNotes || '').trim());
      if (!hasDamageNotes) score += SCORE.CLEAN_CHECKOUT_BONUS;
    }
  }

  const landlordAgreementIds = (
    await RentalAgreement.findAll({
      where: { landlordId: userId },
      attributes: ['id'],
    })
  ).map((a) => a.id);

  if (landlordAgreementIds.length > 0) {
    const handledTickets = await MaintenanceTicket.count({
      where: {
        agreementId: { [Op.in]: landlordAgreementIds },
        status: 'CLOSED',
        landlordResponse: { [Op.ne]: null },
      },
    });
    score += handledTickets * SCORE.MAINTENANCE_HANDLED_BONUS;
  }

  const finalScore = clampScore(score, 0, maxScore);
  await user.update({ trustScore: finalScore });
  logger.debug(`Trust score recalculated userId=${userId} score=${finalScore}`);
  return finalScore;
}

/** Recalc trust for all tenant parties on an agreement (after payment / checkout). */
async function recalcTrustScoreForAgreement(agreementId) {
  const parties = await AgreementParty.findAll({
    where: { agreementId, role: 'tenant' },
    attributes: ['userId'],
  });
  const scores = await Promise.all(
    parties.map((p) => recalcTrustScore(p.userId).catch((err) => {
      logger.warn(`Trust score recalc failed userId=${p.userId}: ${err.message}`);
      return null;
    }))
  );
  return scores.filter((s) => s !== null);
}

module.exports = {
  recalcTrustScore,
  recalcTrustScoreForAgreement,
  clampScore,
  SCORE,
};
