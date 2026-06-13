const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { RentalAgreement, AgreementParty, LedgerRow, MaintenanceTicket, Match, Apartment } = require('../models');
const { Op } = require('sequelize');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.activeRole || req.user.role || 'tenant';
    const limit = parseInt(req.query.limit) || 20;

    const notifications = [];

    if (role === 'tenant') {
      // 1. Fetch all agreement party mappings where this user is tenant
      const parties = await AgreementParty.findAll({
        where: { userId, role: 'tenant' }
      });
      const agreementIds = parties.map(p => p.agreementId);

      if (agreementIds.length > 0) {
        // Contracts
        const agreements = await RentalAgreement.findAll({
          where: { id: { [Op.in]: agreementIds } }
        });
        
        for (const contract of agreements) {
          if (contract.status === 'PENDING_SIGN' && !contract.tenantSignedAt && !contract.tenantSigned) {
            notifications.push({
              id: `contract-sign-${contract.id}`,
              type: 'contract',
              title: 'חוזה ממתין לחתימתך',
              body: `חוזה שכירות עבור נכס #${contract.propertyId ? contract.propertyId.substring(0, 5) : ''} ממתין לחתימתך.`,
              createdAt: contract.createdAt,
              read: false,
              link: `/contracts`,
            });
          }
        }

        // Overdue/Unpaid Ledger Rows
        const unpaidRows = await LedgerRow.findAll({
          where: {
            agreementId: { [Op.in]: agreementIds },
            status: { [Op.in]: ['OVERDUE', 'PENDING'] }
          }
        });

        for (const row of unpaidRows) {
          // If past due date
          const isOverdue = row.status === 'OVERDUE' || new Date(row.dueDate) < new Date();
          if (isOverdue) {
            notifications.push({
              id: `payment-overdue-${row.id}`,
              type: 'payment',
              title: 'תשלום שכר דירה בפיגור',
              body: `התשלום בסך ₪${row.amount} עבור חודש ${row.month} עבר את תאריך היעד.`,
              createdAt: row.createdAt,
              read: false,
              link: `/payments`,
            });
          }
        }

        // Open Maintenance Tickets
        const openTickets = await MaintenanceTicket.findAll({
          where: {
            agreementId: { [Op.in]: agreementIds },
            status: { [Op.ne]: 'CLOSED' }
          }
        });

        for (const ticket of openTickets) {
          notifications.push({
            id: `maintenance-${ticket.id}`,
            type: 'maintenance',
            title: `עדכון בקריאת שירות: ${ticket.description ? ticket.description.substring(0, 20) : 'תקלה'}...`,
            body: `סטטוס קריאת השירות הוא: ${ticket.status === 'OPEN' ? 'פתוח' : 'בטיפול'}.`,
            createdAt: ticket.createdAt,
            read: false,
            link: `/maintenance`,
          });
        }
      }
    } else if (role === 'landlord') {
      // Landlord notifications
      // 1. Fetch landlord apartments
      const apartments = await Apartment.findAll({
        where: { landlordId: userId }
      });
      const apartmentIds = apartments.map(a => a.id);

      // Matches / Leads
      const pendingMatches = await Match.findAll({
        where: { landlordId: userId, status: 'pending' },
        include: [{ model: Apartment, as: 'apartment', attributes: ['title'] }]
      });

      for (const match of pendingMatches) {
        notifications.push({
          id: `match-pending-${match.id}`,
          type: 'match',
          title: 'התאמה חדשה לשוכר פוטנציאלי',
          body: `נמצא שוכר מתאים לדירה ${match.apartment?.title || ''}.`,
          createdAt: match.createdAt,
          read: false,
          link: `/leads`,
        });
      }

      // Contracts pending landlord signature
      const landlordContracts = await RentalAgreement.findAll({
        where: { landlordId: userId }
      });

      for (const contract of landlordContracts) {
        if (contract.status === 'PENDING_SIGN' && !contract.landlordSignedAt && !contract.landlordSigned) {
          notifications.push({
            id: `contract-sign-landlord-${contract.id}`,
            type: 'contract',
            title: 'חוזה ממתין לחתימתך',
            body: 'חוזה שכירות חדש ממתין לחתימתך כדי להפעילו.',
            createdAt: contract.createdAt,
            read: false,
            link: `/contracts`,
          });
        }
      }

      // Payments reported (waiting confirm)
      const agreementIds = landlordContracts.map(c => c.id);
      if (agreementIds.length > 0) {
        const reportedRows = await LedgerRow.findAll({
          where: {
            agreementId: { [Op.in]: agreementIds },
            status: 'REPORTED'
          }
        });

        for (const row of reportedRows) {
          notifications.push({
            id: `payment-reported-${row.id}`,
            type: 'payment',
            title: 'דיווח תשלום משוכר',
            body: `הדייר דיווח על תשלום בסך ₪${row.amount} עבור חודש ${row.month}.`,
            createdAt: row.createdAt,
            read: false,
            link: `/payments`,
          });
        }

        // Maintenance tickets
        const openTickets = await MaintenanceTicket.findAll({
          where: {
            agreementId: { [Op.in]: agreementIds },
            status: { [Op.ne]: 'CLOSED' }
          }
        });

        for (const ticket of openTickets) {
          notifications.push({
            id: `maintenance-landlord-${ticket.id}`,
            type: 'maintenance',
            title: 'דיווח על תקלה חדשה',
            body: `הדייר דיווח על תקלה: ${ticket.description ? ticket.description.substring(0, 30) : ''}...`,
            createdAt: ticket.createdAt,
            read: false,
            link: `/maintenance`,
          });
        }
      }
    }

    // Sort by createdAt desc and limit
    const sorted = notifications
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);

    // Format relative time helper
    const formatted = sorted.map(n => {
      const diffMs = new Date().getTime() - new Date(n.createdAt || Date.now()).getTime();
      const diffMins = Math.round(diffMs / (1000 * 60));
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      let timeStr = 'זה עתה';
      if (diffMins > 0 && diffMins < 60) timeStr = `לפני ${diffMins} דקות`;
      else if (diffHours > 0 && diffHours < 24) timeStr = `לפני ${diffHours} שעות`;
      else if (diffDays > 0) timeStr = `לפני ${diffDays} ימים`;
      
      return {
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        time: timeStr,
        read: n.read,
        link: n.link,
      };
    });

    res.json({ notifications: formatted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
