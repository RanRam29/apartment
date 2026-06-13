const { sequelize } = require('../config/database');
const { User, TrustScoreEvent } = require('../models');
const logger = require('../utils/logger');

const TRUST_EVENTS = {
  kyc_approved: { delta: 20, isOnce: true, roles: ['tenant'] },
  income_verified: { delta: 15, isOnce: true, roles: ['tenant'] },
  rent_paid_on_time: { delta: 5, cap: 30, roles: ['tenant'] },
  streak_6_months: { delta: 10, roles: ['tenant'] },
  checkin_checkout_clean: { delta: 10, roles: ['tenant'] },
  whatsapp_opt_in: { delta: 5, isOnce: true, roles: ['tenant', 'landlord'] },
  ownership_verified: { delta: 25, cap: 25, roles: ['landlord'] },
  fast_lead_response: { delta: 15, isRolling: true, roles: ['landlord'] },
  fast_maintenance: { delta: 15, isRolling: true, roles: ['landlord'] },
  digital_signing: { delta: 15, cap: 15, roles: ['tenant', 'landlord'] },
  positive_reviews: { delta: 15, isRolling: true, roles: ['landlord'] },
};

async function applyTrustEvent(userId, eventKey, { meta, dedupeKey } = {}) {
  const eventConfig = TRUST_EVENTS[eventKey];
  if (!eventConfig) {
    throw new Error(`Unknown trust event key: ${eventKey}`);
  }

  if (eventConfig.isOnce && !dedupeKey) {
    dedupeKey = `${eventKey}:${userId}`;
  }

  try {
    return await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, { transaction });
      if (!user) return null;

      let deltaToApply = eventConfig.delta;
      if (eventConfig.cap !== undefined) {
        const existingSum = await TrustScoreEvent.sum('delta', {
          where: { userId, eventKey },
          transaction
        }) || 0;
        if (existingSum >= eventConfig.cap) {
          deltaToApply = 0;
        } else {
          deltaToApply = Math.min(deltaToApply, eventConfig.cap - existingSum);
        }
      }

      const newScore = Math.min(100, Math.max(0, user.trustScore + deltaToApply));
      const actualDelta = newScore - user.trustScore;

      const newEvent = await TrustScoreEvent.create({
        userId,
        eventKey,
        delta: actualDelta,
        meta,
        dedupeKey
      }, { transaction });

      user.trustScore = newScore;
      await user.save({ transaction });

      return newEvent;
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return null;
    }
    throw err;
  }
}

async function revokeTrustEvent(userId, eventKey) {
  const eventConfig = TRUST_EVENTS[eventKey];
  if (!eventConfig) {
    throw new Error(`Unknown trust event key: ${eventKey}`);
  }

  try {
    return await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, { transaction });
      if (!user) return null;

      const existingSum = await TrustScoreEvent.sum('delta', {
        where: { userId, eventKey },
        transaction
      }) || 0;

      if (existingSum <= 0) {
        return null;
      }

      const deltaToApply = -existingSum;
      const newScore = Math.min(100, Math.max(0, user.trustScore + deltaToApply));
      const actualDelta = newScore - user.trustScore;

      const newEvent = await TrustScoreEvent.create({
        userId,
        eventKey,
        delta: actualDelta,
        meta: { revoked: true }
      }, { transaction });

      user.trustScore = newScore;
      await user.save({ transaction });

      return newEvent;
    });
  } catch (err) {
    throw err;
  }
}

async function getTrustStatus(userId, role) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const userEvents = await TrustScoreEvent.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });

  // history: latest 50
  const history = userEvents.slice(0, 50);

  // Group by eventKey for in-memory analysis
  const eventGroups = {};
  for (const ev of userEvents) {
    if (!eventGroups[ev.eventKey]) {
      eventGroups[ev.eventKey] = { count: 0, sum: 0 };
    }
    eventGroups[ev.eventKey].count += 1;
    eventGroups[ev.eventKey].sum += ev.delta;
  }

  const activeTasks = [];
  for (const [key, config] of Object.entries(TRUST_EVENTS)) {
    if (!config.roles.includes(role)) continue;

    let remainingPoints = config.delta;
    let status = 'PENDING';

    const group = eventGroups[key];
    if (config.isOnce) {
      if (group && group.count > 0) {
        remainingPoints = 0;
        status = 'COMPLETED';
      }
    } else if (config.cap !== undefined) {
      const sum = group ? group.sum : 0;
      remainingPoints = Math.max(0, config.cap - sum);
      if (remainingPoints === 0) {
        status = 'COMPLETED';
      } else if (sum > 0) {
        status = 'PARTIAL';
      }
    } else {
      const sum = group ? group.sum : 0;
      if (sum >= config.delta) {
        remainingPoints = 0;
        status = 'COMPLETED';
      }
    }

    activeTasks.push({
      eventKey: key,
      points: remainingPoints,
      status,
    });
  }

  return {
    score: user.trustScore,
    history,
    activeTasks,
  };
}

/**
 * Returns true when a ledger row was confirmed paid on or before its due date.
 */
function isPaidOnTime(row) {
  if (row.status !== 'PAID' || !row.confirmedByLandlord) return false;
  const paidAt = new Date(row.confirmedByLandlord);
  const dueEnd = new Date(`${row.dueDate}T23:59:59.999`);
  return paidAt <= dueEnd;
}

/**
 * Auto-fires behaviour-based NF3 trust events for the tenant(s) of an agreement.
 *
 * Bridges the auto-trigger intent of the original recalc design (V2-5) onto the
 * live event-sourced trust system: instead of recomputing the score from scratch,
 * it emits the matching NF3 trust events idempotently (stable dedupeKey per ledger
 * row / per agreement) and lets `applyTrustEvent` handle caps and ceilings.
 *
 * Invoked from ledgerService.confirmPayment / autoConfirmStalePayments (on-time
 * rent) and contractsV3 checkout/complete (clean checkout). Non-fatal by design —
 * trust scoring must never break a payment confirmation or checkout.
 *
 * @param {string} agreementId
 * @returns {Promise<string[]>} tenant userIds processed
 */
async function recalcTrustScoreForAgreement(agreementId) {
  const { LedgerRow, RentalAgreement, AgreementParty, AgreementRoom } = require('../models');

  try {
    const tenants = await AgreementParty.findAll({
      where: { agreementId, role: 'tenant' },
      attributes: ['userId'],
    });
    if (tenants.length === 0) return [];

    const paidRows = await LedgerRow.findAll({ where: { agreementId, status: 'PAID' } });
    const onTimeRows = paidRows.filter(isPaidOnTime);

    const agreement = await RentalAgreement.findByPk(agreementId);
    let cleanCheckout = false;
    if (agreement && agreement.checkoutCompletedAt) {
      const rooms = await AgreementRoom.findAll({
        where: { agreementId },
        attributes: ['checkoutNotes'],
      });
      cleanCheckout = !rooms.some((r) => String(r.checkoutNotes || '').trim());
    }

    const processed = [];
    for (const { userId } of tenants) {
      for (const row of onTimeRows) {
        await applyTrustEvent(userId, 'rent_paid_on_time', {
          dedupeKey: `rent_paid_on_time:${userId}:${row.id}`,
          meta: { agreementId, ledgerRowId: row.id },
        });
      }
      if (cleanCheckout) {
        await applyTrustEvent(userId, 'checkin_checkout_clean', {
          dedupeKey: `checkin_checkout_clean:${userId}:${agreementId}`,
          meta: { agreementId },
        });
      }
      processed.push(userId);
    }
    return processed;
  } catch (err) {
    logger.warn(`recalcTrustScoreForAgreement failed agreementId=${agreementId}: ${err.message}`);
    return [];
  }
}

module.exports = {
  TRUST_EVENTS,
  applyTrustEvent,
  revokeTrustEvent,
  getTrustStatus,
  recalcTrustScoreForAgreement,
  isPaidOnTime,
};
