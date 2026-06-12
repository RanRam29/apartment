const crypto = require('crypto');
const { Op } = require('sequelize');
const { User } = require('../models');
const logger = require('../utils/logger');
const { logAudit } = require('../services/auditLogService');
const { AUDIT_OUTCOMES } = require('../constants/logging');

const GRACE_PERIOD_DAYS = 30;

async function runAccountDeletion() {
  const cutoff = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const users = await User.findAll({
    where: {
      deletionRequestedAt: { [Op.lt]: cutoff },
      email: { [Op.notLike]: 'deleted-%' },
    },
  });

  for (const user of users) {
    await user.update({
      email: `deleted-${user.id}@deleted.dirapp.local`,
      firstName: 'משתמש',
      lastName: 'שנמחק',
      phone: null,
      avatarUrl: null,
      bio: null,
      passwordHash: crypto.randomBytes(32).toString('hex'),
      verificationToken: null,
      isLocked: true,
      whatsappOptIn: false,
    });
    await logAudit({
      actorId: null,
      actorRole: 'system',
      action: 'GDPR_DELETION_EXECUTED',
      resourceType: 'user',
      resourceId: user.id,
      outcome: AUDIT_OUTCOMES.SUCCESS,
      statusCode: 200,
    });
    logger.info(`GDPR deletion executed for user ${user.id}`);
  }

  return users.length;
}

module.exports = { runAccountDeletion, GRACE_PERIOD_DAYS };
