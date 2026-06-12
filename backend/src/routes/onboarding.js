const express = require('express');
const { authenticate } = require('../middleware/auth');
const { User, UserKycProfile, Apartment, RentalAgreement } = require('../models');

const router = express.Router();

const TENANT_CHECKLIST = [
  { key: 'kyc', title: 'אימות זהות (KYC)' },
  { key: 'preferences', title: 'העדפות חיפוש (ביו)' },
  { key: 'whatsapp', title: 'חיבור WhatsApp לקבלת התראות' }
];

const LANDLORD_CHECKLIST = [
  { key: 'first_property', title: 'פרסום נכס ראשון' },
  { key: 'contract_uploaded', title: 'העלאת חוזה שכירות' },
  { key: 'whatsapp', title: 'חיבור WhatsApp לקבלת התראות' }
];

// GET /api/v3/onboarding/checklist
router.get('/checklist', authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const role = user.activeRole || 'tenant';
    const userId = user.id;
    const onboardingState = user.onboardingState || {};
    const dismissed = onboardingState.dismissed || {};

    let rawList = [];
    if (role === 'landlord') {
      rawList = LANDLORD_CHECKLIST;
    } else {
      rawList = TENANT_CHECKLIST;
    }

    const checklist = [];
    let completedCount = 0;

    for (const item of rawList) {
      let completed = false;

      if (role === 'landlord') {
        if (item.key === 'first_property') {
          const count = await Apartment.count({ where: { landlordId: userId } });
          completed = count > 0;
        } else if (item.key === 'contract_uploaded') {
          const count = await RentalAgreement.count({ where: { landlordId: userId } });
          completed = count > 0;
        } else if (item.key === 'whatsapp') {
          completed = !!user.whatsappOptIn;
        }
      } else {
        // tenant
        if (item.key === 'kyc') {
          const kyc = await UserKycProfile.findOne({ where: { userId } });
          completed = kyc && kyc.status === 'APPROVED';
        } else if (item.key === 'preferences') {
          completed = !!user.bio;
        } else if (item.key === 'whatsapp') {
          completed = !!user.whatsappOptIn;
        }
      }

      if (completed) {
        completedCount++;
      }

      checklist.push({
        key: item.key,
        title: item.title,
        completed,
        dismissed: !!dismissed[item.key]
      });
    }

    const completionPct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

    res.json({
      role,
      checklist,
      completionPct
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v3/onboarding/step/:key/dismiss
router.post('/step/:key/dismiss', authenticate, async (req, res, next) => {
  try {
    const { key } = req.params;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const onboardingState = user.onboardingState || {};
    onboardingState.dismissed = onboardingState.dismissed || {};
    onboardingState.dismissed[key] = true;

    // Trigger Sequelize update detection by re-assigning user.onboardingState
    user.onboardingState = { ...onboardingState };
    user.changed('onboardingState', true);
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
