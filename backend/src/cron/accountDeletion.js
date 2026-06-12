const crypto = require('crypto');
const { Op } = require('sequelize');
const { User } = require('../models');
const { logAudit } = require('../services/auditLogService');

async function runAccountDeletion() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
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
      action: 'GDPR_DELETION_EXECUTED',
      actorRole: 'system',
      resourceType: 'user',
      resourceId: user.id,
      outcome: 'success',
      statusCode: 200,
    });
  }

  return users.length;
}

module.exports = { runAccountDeletion };
