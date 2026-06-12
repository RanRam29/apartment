const express = require('express');
const router = express.Router();
const { authGuard, requireKyc, requireAgreementRole } = require('../middleware/authGuard');
const { stateLockGuard } = require('../middleware/stateLockGuard');
const { RentalAgreement, UserKycProfile, AgreementGuarantor, Apartment, AppConfig } = require('../models');
const { seedLedgerRows } = require('../services/ledgerSeedService');

router.use(authGuard);

router.post('/',
  requireAgreementRole('landlord'),
  async (req, res, next) => {
    try {
      const { propertyId } = req.body;
      if (!propertyId) {
        return res.status(400).json({ error: 'propertyId is required' });
      }

      const property = await Apartment.findByPk(propertyId);
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
      if (property.landlordId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You do not own this property' });
      }

      const agreement = await RentalAgreement.create({
        landlordId: req.user.id,
        propertyId,
        status: 'DRAFT',
      });

      res.status(201).json(agreement);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/:id', async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id, {
      include: [
        { model: Apartment, as: 'apartment', attributes: ['id', 'title', 'address', 'city'] },
        { model: AgreementGuarantor, as: 'guarantors' },
      ],
    });
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }
    res.json(agreement);
  } catch (err) {
    next(err);
  }
});

router.put('/:id',
  stateLockGuard,
  async (req, res, next) => {
    try {
      const agreement = req.agreement || await RentalAgreement.findByPk(req.params.id);
      if (!agreement) {
        return res.status(404).json({ error: 'Agreement not found' });
      }

      const allowedFields = [
        'tenantId', 'startDate', 'endDate', 'monthlyRentIls',
        'paymentDueDay', 'cpiLinked', 'optionMonths', 'optionNoticeDays',
        'habitabilityDeclaration', 'behavioralClauses',
      ];

      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (updates.startDate && updates.endDate) {
        const start = new Date(updates.startDate);
        const end = new Date(updates.endDate);
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);
        if (diffDays < 90) {
          return res.status(422).json({ error: 'Minimum lease term is 3 months (90 days)' });
        }
      } else if (updates.endDate && agreement.startDate) {
        const start = new Date(agreement.startDate);
        const end = new Date(updates.endDate);
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);
        if (diffDays < 90) {
          return res.status(422).json({ error: 'Minimum lease term is 3 months (90 days)' });
        }
      }

      if (updates.monthlyRentIls !== undefined) {
        const rent = parseFloat(updates.monthlyRentIls);
        const guaranteeCap = rent * 3;
        const guarantors = await AgreementGuarantor.findAll({
          where: { agreementId: agreement.id },
        });
        const totalGuarantees = guarantors.reduce((sum, g) => sum + (g.guaranteeAmount || 0), 0);
        if (totalGuarantees > guaranteeCap) {
          return res.status(422).json({
            error: 'Guarantee total exceeds legal cap (3x monthly rent)',
            guaranteeCap,
          });
        }
      }

      await agreement.update(updates);
      res.json(agreement);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/:id/transition',
  requireKyc,
  async (req, res, next) => {
    try {
      const agreement = await RentalAgreement.findByPk(req.params.id, {
        include: [{ model: AgreementGuarantor, as: 'guarantors' }],
      });
      if (!agreement) {
        return res.status(404).json({ error: 'Agreement not found' });
      }

      const { targetStatus } = req.body;
      const validTransitions = {
        DRAFT: 'PENDING_REVIEW',
        PENDING_REVIEW: 'READY_SIGN',
        READY_SIGN: 'SIGNED',
      };

      if (validTransitions[agreement.status] !== targetStatus) {
        return res.status(422).json({
          error: `Invalid transition from ${agreement.status} to ${targetStatus}`,
        });
      }

      const errors = [];

      if (targetStatus === 'PENDING_REVIEW') {
        if (!agreement.startDate) errors.push('startDate is required');
        if (!agreement.endDate) errors.push('endDate is required');
        if (!agreement.monthlyRentIls) errors.push('monthlyRentIls is required');
        if (!agreement.paymentDueDay) errors.push('paymentDueDay is required');
        if (agreement.startDate && agreement.endDate) {
          const diffDays = (new Date(agreement.endDate) - new Date(agreement.startDate)) / (1000 * 60 * 60 * 24);
          if (diffDays < 90) errors.push('Minimum lease term is 3 months');
        }
      }

      if (targetStatus === 'READY_SIGN') {
        const guarantors = agreement.guarantors || [];
        const pendingGuarantors = guarantors.filter(g => g.invitationStatus !== 'APPROVED');
        if (pendingGuarantors.length > 0) {
          errors.push(`${pendingGuarantors.length} guarantor(s) have not completed KYC`);
        }

        const landlordKyc = await UserKycProfile.findOne({ where: { userId: agreement.landlordId } });
        if (!landlordKyc || landlordKyc.status !== 'APPROVED') {
          errors.push('Landlord KYC not approved');
        }

        if (agreement.tenantId) {
          const tenantKyc = await UserKycProfile.findOne({ where: { userId: agreement.tenantId } });
          if (!tenantKyc || tenantKyc.status !== 'APPROVED') {
            errors.push('Tenant KYC not approved');
          }
        } else {
          errors.push('No tenant assigned to agreement');
        }

        const hab = agreement.habitabilityDeclaration || {};
        const requiredHab = ['water', 'electricity', 'sewage', 'ventilation', 'locking_door'];
        for (const field of requiredHab) {
          if (!hab[field]) errors.push(`Habitability: ${field} is not declared`);
        }
      }

      if (errors.length > 0) {
        return res.status(422).json({ error: 'Transition blocked', reasons: errors });
      }

      if (targetStatus === 'SIGNED') {
        const config = await AppConfig.findOne({ where: { key: 'cpi_index_current' } });
        const cpiIndex = config?.value
          ? parseFloat(config.value)
          : (agreement.baseCpiIndex ? parseFloat(agreement.baseCpiIndex) : 100);

        const now = new Date();
        await agreement.update({
          status: 'SIGNED',
          tenantSignedAt: agreement.tenantSignedAt || now,
          landlordSignedAt: agreement.landlordSignedAt || now,
          baseCpiIndex: cpiIndex,
        });

        const ledgerRows = await seedLedgerRows(agreement);

        // Trigger Trust Score for both parties
        try {
          const { applyTrustEvent } = require('../services/trustScoreService');
          if (agreement.tenantId) {
            await applyTrustEvent(agreement.tenantId, 'digital_signing', {
              meta: { agreementId: agreement.id }
            });
          }
          if (agreement.landlordId) {
            await applyTrustEvent(agreement.landlordId, 'digital_signing', {
              meta: { agreementId: agreement.id }
            });
          }
        } catch (_) {}

        return res.json({
          status: agreement.status,
          baseCpiIndex: agreement.baseCpiIndex,
          ledgerRowsCreated: ledgerRows.length,
          message: 'Agreement signed and ledger seeded',
        });
      }

      await agreement.update({ status: targetStatus });
      res.json({ status: agreement.status, message: `Agreement transitioned to ${targetStatus}` });
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/:id',
  stateLockGuard,
  async (req, res, next) => {
    try {
      const agreement = req.agreement || await RentalAgreement.findByPk(req.params.id);
      if (!agreement) {
        return res.status(404).json({ error: 'Agreement not found' });
      }
      await agreement.destroy();
      res.json({ message: 'Agreement deleted' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
