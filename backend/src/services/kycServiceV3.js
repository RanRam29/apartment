const crypto = require('crypto');
const { UserKycProfile } = require('../models');

function validateIsraeliId(id) {
  const padded = String(id).padStart(9, '0');
  if (padded.length !== 9 || !/^\d+$/.test(padded)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(padded[i]) * ((i % 2) + 1);
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  return sum % 10 === 0;
}

function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function initiateVerification(userId) {
  const existing = await UserKycProfile.findOne({ where: { userId } });
  if (existing?.status === 'APPROVED') return { status: 'already_approved' };

  const [kyc] = await UserKycProfile.upsert({
    userId,
    status: 'PENDING',
    personaInquiryId: `inq_${crypto.randomUUID()}`,
  });

  return { status: 'initiated', inquiryId: kyc.personaInquiryId };
}

async function handleWebhook(rawBody, signature) {
  const secret = process.env.PERSONA_WEBHOOK_SECRET || 'test-webhook-secret';
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    throw Object.assign(new Error('Invalid webhook signature'), { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const inquiryId = payload.data?.attributes?.inquiry_id || payload.data?.id;
  const status = payload.data?.attributes?.status;

  const kyc = await UserKycProfile.findOne({ where: { personaInquiryId: inquiryId } });
  if (!kyc) return { processed: false };

  const newStatus = status === 'completed' ? 'APPROVED' : status === 'failed' ? 'REJECTED' : kyc.status;
  await kyc.update({ status: newStatus });

  if (newStatus === 'APPROVED') {
    await checkAndUnlockContracts(kyc.userId);

    // Trigger gamification!
    try {
      const gamificationService = require('./gamificationService');
      await gamificationService.awardPoints(kyc.userId, 'identity_verified').catch(() => {});
    } catch (_) {}
  }

  return { processed: true, status: newStatus };
}

async function checkAndUnlockContracts(userId) {
  try {
    const models = require('../models');
    const AgreementParty = models.AgreementParty;
    if (AgreementParty) {
      const parties = await AgreementParty.findAll({ where: { userId } });
      for (const party of parties) {
        await party.update({ kycStatus: 'APPROVED' });
      }
    }
  } catch (_) {
    // Fail-safe if AgreementParty is not defined or not yet merged by Claude Code
  }
}

module.exports = {
  validateIsraeliId,
  verifyWebhookSignature,
  initiateVerification,
  handleWebhook,
  checkAndUnlockContracts,
};
