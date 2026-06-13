const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { AgreementGuarantor } = require('../models');
const { sendGuarantorInvite } = require('../services/resendService');
const { scheduleReminder, cancelReminder } = require('../services/notificationService');
const { authenticate, requireRole } = require('../middleware/auth');

function guarantorExpiry24hDedupeKey(guarantorId) {
  return `guarantor:${guarantorId}:expiry24h`;
}

async function cancelGuarantorExpiryReminder(guarantorId) {
  await cancelReminder({ dedupeKey: guarantorExpiry24hDedupeKey(guarantorId) }).catch(() => {});
}

// Load RentalAgreement dynamically
let RentalAgreement;
try {
  RentalAgreement = require('../models').RentalAgreement;
} catch (_) {}

// Invite a guarantor (landlord action)
router.post('/invite', authenticate, requireRole('landlord'), async (req, res, next) => {
  try {
    const { agreementId, email, name } = req.body;
    
    let agreementAddress = 'כתובת הנכס';
    let agreementRent = 5000;
    let agreementPeriod = 'תקופת שכירות';

    if (RentalAgreement) {
      const agreement = await RentalAgreement.findByPk(agreementId);
      if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
      agreementAddress = agreement.extractedFields?.address || 'כתובת הנכס';
      agreementRent = agreement.monthlyRentIls || 5000;
      agreementPeriod = `${agreement.startDate || ''} - ${agreement.endDate || ''}`;
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days

    const guarantor = await AgreementGuarantor.create({
      agreementId,
      email,
      name,
      invitationToken: token,
      invitationExpiresAt: expiresAt,
      invitationStatus: 'PENDING',
    });

    const link = `${process.env.GUARANTOR_WEB_URL || 'https://guarantor.dirapp.co.il'}/flow/${token}`;
    await sendGuarantorInvite({
      to: email,
      landlordName: req.user.email,
      propertyAddress: agreementAddress,
      rentAmount: agreementRent,
      period: agreementPeriod,
      link,
    }).catch(() => {});

    const reminderAt = new Date(expiresAt.getTime() - 24 * 60 * 60 * 1000);
    if (reminderAt.getTime() > Date.now()) {
      await scheduleReminder(
        req.user.id,
        reminderAt,
        {
          title: 'תזכורת: הזמנת ערבות עומדת לפוג',
          body: `הקישור לערב ${name} יפוג בעוד 24 שעות.`,
          data: {
            type: 'guarantor_expiry_24h',
            guarantorId: guarantor.id,
            agreementId,
          },
        },
        { dedupeKey: guarantorExpiry24hDedupeKey(guarantor.id) }
      ).catch(() => {});
    }

    res.status(201).json({ guarantor, link });
  } catch (err) {
    next(err);
  }
});

// Get guarantor flow data (public — accessed via token)
router.get('/flow/:token', async (req, res, next) => {
  try {
    const guarantor = await AgreementGuarantor.findOne({
      where: { invitationToken: req.params.token },
    });
    if (!guarantor) return res.status(404).json({ error: 'Invalid or expired link' });
    if (new Date() > guarantor.invitationExpiresAt) {
      return res.status(410).json({ error: 'Link expired' });
    }

    let agreementAddress = 'כתובת הנכס';
    let agreementRent = 5000;
    let agreementStartDate = 'תאריך התחלה';
    let agreementEndDate = 'תאריך סיום';

    if (RentalAgreement) {
      const agreement = await RentalAgreement.findByPk(guarantor.agreementId);
      if (agreement) {
        agreementAddress = agreement.extractedFields?.address || 'כתובת הנכס';
        agreementRent = agreement.monthlyRentIls || 5000;
        agreementStartDate = agreement.startDate;
        agreementEndDate = agreement.endDate;
      }
    }

    res.json({
      guarantorName: guarantor.name,
      propertyAddress: agreementAddress,
      rentAmount: agreementRent,
      startDate: agreementStartDate,
      endDate: agreementEndDate,
    });
  } catch (err) {
    next(err);
  }
});

// Guarantor declines
router.post('/flow/:token/decline', async (req, res, next) => {
  try {
    const guarantor = await AgreementGuarantor.findOne({
      where: { invitationToken: req.params.token },
    });
    if (!guarantor) return res.status(404).json({ error: 'Invalid link' });

    await guarantor.update({ invitationStatus: 'DECLINED' });
    await cancelGuarantorExpiryReminder(guarantor.id);

    if (RentalAgreement) {
      const agreement = await RentalAgreement.findByPk(guarantor.agreementId);
      if (agreement) {
        const { notify } = require('../services/notificationService');
        await notify(agreement.landlordId, {
          title: 'ערב דחה הזמנה',
          body: `${guarantor.name} דחה את הזמנת הערבות`,
        }).catch(() => {});
      }
    }

    res.json({ status: 'declined' });
  } catch (err) {
    next(err);
  }
});

// Guarantor completes KYC + signs
router.post('/flow/:token/complete', async (req, res, next) => {
  try {
    const guarantor = await AgreementGuarantor.findOne({
      where: { invitationToken: req.params.token },
    });
    if (!guarantor) return res.status(404).json({ error: 'Invalid link' });

    await guarantor.update({
      invitationStatus: 'APPROVED',
      signedAt: new Date(),
    });
    await cancelGuarantorExpiryReminder(guarantor.id);

    res.json({ status: 'completed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
