const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { RentalAgreement, AgreementParty, AgreementRoom, LedgerRow, MaintenanceTicket } = require('../models');

router.get('/journal', authenticate, requireRole('tenant'), async (req, res, next) => {
  try {
    const tenantId = req.user.id;

    // Find latest agreement for this tenant
    const party = await AgreementParty.findOne({
      where: { userId: tenantId, role: 'tenant' },
      order: [['createdAt', 'DESC']],
    });

    if (!party) {
      return res.json({
        contract: null,
        ledgerEntries: [],
        checkIn: null,
        maintenance: [],
        checkOut: null,
      });
    }

    const agreementId = party.agreementId;

    // 1. Fetch contract
    const contract = await RentalAgreement.findByPk(agreementId);

    // 2. Fetch ledger rows
    const ledgerEntries = await LedgerRow.findAll({
      where: { agreementId },
      order: [['dueDate', 'ASC']],
    });

    // 3. Fetch rooms for check-in and check-out photos
    const rooms = await AgreementRoom.findAll({
      where: { agreementId },
      order: [['createdAt', 'ASC']],
    });

    const checkIn = {
      rooms: rooms.map(r => ({
        id: r.id,
        name: r.name,
        photos: r.checkinPhotos || [],
      })),
      completedAt: contract?.checkinCompletedAt || null,
    };

    const checkOut = {
      rooms: rooms.map(r => ({
        id: r.id,
        name: r.name,
        photos: r.checkoutPhotos || [],
        notes: r.checkoutNotes || '',
      })),
      completedAt: contract?.checkoutCompletedAt || null,
    };

    // 4. Fetch maintenance tickets
    const maintenance = await MaintenanceTicket.findAll({
      where: { agreementId },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      contract,
      ledgerEntries,
      checkIn,
      maintenance,
      checkOut,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
