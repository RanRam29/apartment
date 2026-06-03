const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { User, RentalAgreement, AgreementParty, LedgerRow, MaintenanceTicket, UserKycProfile } = require('../models');
const { Op } = require('sequelize');

// GET /api/v3/renter-journal/:userId - Aggregated portable Renter Journal
router.get('/:userId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // 1. Fetch User details
    const renter = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl', 'bio', 'trustScore', 'isVerified']
    });
    if (!renter) return res.status(404).json({ error: 'User not found' });

    // 2. Fetch KYC profile status
    const kyc = await UserKycProfile.findOne({ where: { userId } });
    const kycStatus = kyc ? kyc.status : 'NONE';

    // 3. Fetch all agreements the user has participated in
    const parties = await AgreementParty.findAll({
      where: { userId, role: 'tenant' }
    });
    const agreementIds = parties.map(p => p.agreementId);

    let contracts = [];
    let paymentsSummary = { totalRentRows: 0, paid: 0, unpaid: 0, overdue: 0 };
    let maintenanceCount = 0;
    let checkinCount = 0;
    let checkoutCount = 0;

    if (agreementIds.length > 0) {
      // Contracts summaries
      const agreements = await RentalAgreement.findAll({
        where: { id: { [Op.in]: agreementIds } },
        order: [['createdAt', 'DESC']]
      });

      contracts = agreements.map(a => ({
        id: a.id,
        startDate: a.startDate,
        endDate: a.endDate,
        monthlyRentIls: parseFloat(a.monthlyRentIls || a.monthlyRent || 0),
        status: a.status,
        checkinCompletedAt: a.checkinCompletedAt,
        checkoutCompletedAt: a.checkoutCompletedAt,
      }));

      // Count checkins and checkouts
      checkinCount = agreements.filter(a => a.checkinCompletedAt).length;
      checkoutCount = agreements.filter(a => a.checkoutCompletedAt).length;

      // Ledger details
      const ledgers = await LedgerRow.findAll({
        where: { agreementId: { [Op.in]: agreementIds } }
      });

      paymentsSummary.totalRentRows = ledgers.length;
      paymentsSummary.paid = ledgers.filter(l => l.status === 'PAID').length;
      paymentsSummary.unpaid = ledgers.filter(l => l.status === 'PENDING' || l.status === 'REPORTED').length;
      paymentsSummary.overdue = ledgers.filter(l => l.status === 'OVERDUE' || (l.status === 'PENDING' && new Date(l.dueDate) < new Date())).length;

      // Maintenance tickets
      maintenanceCount = await MaintenanceTicket.count({
        where: { agreementId: { [Op.in]: agreementIds } }
      });
    }

    res.json({
      renter: {
        id: renter.id,
        firstName: renter.firstName,
        lastName: renter.lastName,
        email: renter.email,
        phone: renter.phone,
        avatarUrl: renter.avatarUrl,
        bio: renter.bio || '',
        trustScore: renter.trustScore,
        isVerified: renter.isVerified,
        kycStatus,
      },
      contracts,
      paymentsSummary,
      checkIn: { completedCount: checkinCount },
      checkOut: { completedCount: checkoutCount },
      maintenance: { totalCount: maintenanceCount },
      isEditable: req.user.id === userId,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v3/renter-journal/:userId - Update renter profile details
router.put('/:userId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'You are only allowed to edit your own renter journal profile.' });
    }

    const renter = await User.findByPk(userId);
    if (!renter) return res.status(404).json({ error: 'User not found' });

    const { firstName, lastName, bio, avatarUrl } = req.body;
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    await renter.update(updates);
    
    // Return updated renter attributes
    res.json({
      id: renter.id,
      firstName: renter.firstName,
      lastName: renter.lastName,
      email: renter.email,
      phone: renter.phone,
      avatarUrl: renter.avatarUrl,
      bio: renter.bio || '',
      trustScore: renter.trustScore,
      isVerified: renter.isVerified,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
