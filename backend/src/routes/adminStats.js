const express = require('express');
const router = express.Router();
const { Op, fn, col, literal } = require('sequelize');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  User, Apartment, Swipe, Match, AuditLog, LedgerRow,
  RentalAgreement, ContractAmendment, AgreementGuarantor,
  MaintenanceTicket, TicketInvoice, UserKycProfile,
} = require('../models');
const SystemEvent = require('../models/mongo/SystemEvent');
const Message = require('../models/mongo/Message');
const UserPoints = require('../models/mongo/UserPoints');

router.use(authenticate);
router.use(requireRole('admin'));

// Helper: date thresholds
function ago(unit, n) {
  const d = new Date();
  if (unit === 'h') d.setHours(d.getHours() - n);
  if (unit === 'd') d.setDate(d.getDate() - n);
  return d;
}

router.get('/detailed', async (req, res, next) => {
  try {
    const dayAgo = ago('h', 24);
    const weekAgo = ago('d', 7);
    const monthAgo = ago('d', 30);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

    // ── Users ──
    const [total, tenants, landlords, admins, verified, locked, premium, tosAccepted,
           activeToday, activeWeek, activeMonth,
           registeredToday, registeredWeek, registeredMonth] = await Promise.all([
      User.count(),
      User.count({ where: { role: 'tenant' } }),
      User.count({ where: { role: 'landlord' } }),
      User.count({ where: { role: 'admin' } }),
      UserKycProfile.count({ where: { status: 'APPROVED' } }),
      User.count({ where: { isLocked: true } }),
      User.count({ where: { isPremium: true } }),
      User.count({ where: { tosAcceptedAt: { [Op.ne]: null } } }),
      User.count({ where: { lastActiveAt: { [Op.gte]: dayAgo } } }),
      User.count({ where: { lastActiveAt: { [Op.gte]: weekAgo } } }),
      User.count({ where: { lastActiveAt: { [Op.gte]: monthAgo } } }),
      User.count({ where: { createdAt: { [Op.gte]: dayAgo } } }),
      User.count({ where: { createdAt: { [Op.gte]: weekAgo } } }),
      User.count({ where: { createdAt: { [Op.gte]: monthAgo } } }),
    ]);

    // ── Listings ──
    const [active, inactive, avgPriceRow, totalViews, totalLikes, topCities] = await Promise.all([
      Apartment.count({ where: { isActive: true } }),
      Apartment.count({ where: { isActive: false } }),
      Apartment.findOne({ attributes: [[fn('AVG', col('price')), 'avg']], raw: true }),
      Apartment.sum('viewCount') || 0,
      Apartment.sum('likeCount') || 0,
      Apartment.findAll({
        attributes: ['city', [fn('COUNT', '*'), 'count']],
        where: { isActive: true },
        group: ['city'],
        order: [[fn('COUNT', '*'), 'DESC']],
        limit: 5,
        raw: true,
      }),
    ]);

    // ── Payments ──
    const [totalLedgerRows, paidRows, pendingRows, overdueRows, paidAmount, overdueAmount, invoiceCount] = await Promise.all([
      LedgerRow.count(),
      LedgerRow.count({ where: { status: 'PAID' } }),
      LedgerRow.count({ where: { status: 'PENDING' } }),
      LedgerRow.count({ where: { status: 'OVERDUE' } }),
      LedgerRow.sum('amount', { where: { status: 'PAID' } }) || 0,
      LedgerRow.sum('amount', { where: { status: 'OVERDUE' } }) || 0,
      TicketInvoice.count(),
    ]);

    // ── Contracts ──
    const [contractActive, pendingSigning, contractEnded, contractExpiring, amendments,
           guarantorsApproved, guarantorsPending] = await Promise.all([
      RentalAgreement.count({ where: { status: 'ACTIVE' } }),
      RentalAgreement.count({ where: { status: 'PENDING_SIGN' } }),
      RentalAgreement.count({ where: { status: 'ENDED' } }),
      RentalAgreement.count({ where: { status: 'EXPIRING' } }),
      ContractAmendment.count(),
      AgreementGuarantor.count({ where: { invitationStatus: 'APPROVED' } }),
      AgreementGuarantor.count({ where: { invitationStatus: 'PENDING' } }),
    ]);

    // ── Interactions ──
    const [totalSwipes, swipesToday, swipesWeek, likes, dislikes, superlikes,
           avgSeenRow, matchesActive, matchesPending, matchesExpired] = await Promise.all([
      Swipe.count(),
      Swipe.count({ where: { createdAt: { [Op.gte]: dayAgo } } }),
      Swipe.count({ where: { createdAt: { [Op.gte]: weekAgo } } }),
      Swipe.count({ where: { direction: 'like' } }),
      Swipe.count({ where: { direction: 'dislike' } }),
      Swipe.count({ where: { direction: 'superlike' } }),
      Swipe.findOne({ attributes: [[fn('AVG', col('seenDurationMs')), 'avg']], raw: true }),
      Match.count({ where: { status: 'accepted' } }),
      Match.count({ where: { status: 'pending' } }),
      Match.count({ where: { status: 'expired' } }),
    ]);

    // ── Maintenance ──
    const [mtOpen, mtInProgress, mtWaiting, mtClosed] = await Promise.all([
      MaintenanceTicket.count({ where: { status: 'OPEN' } }),
      MaintenanceTicket.count({ where: { status: 'IN_PROGRESS' } }),
      MaintenanceTicket.count({ where: { status: 'WAITING_INVOICE' } }),
      MaintenanceTicket.count({ where: { status: 'CLOSED', updatedAt: { [Op.gte]: monthStart } } }),
    ]);

    // ── Engagement (Mongo) ──
    let avgPoints = 0, levelDistribution = {}, messagesToday = 0;
    try {
      const pointsAgg = await UserPoints.aggregate([
        { $group: { _id: null, avg: { $avg: '$points' } } },
      ]);
      avgPoints = Math.round(pointsAgg[0]?.avg || 0);

      const levelAgg = await UserPoints.aggregate([
        { $group: { _id: '$level', count: { $sum: 1 } } },
      ]);
      levelDistribution = {};
      levelAgg.forEach(l => { levelDistribution[l._id] = l.count; });

      messagesToday = await Message.countDocuments({ createdAt: { $gte: dayAgo } });
    } catch (_) { /* MongoDB may not be connected */ }

    // Trust score avg from PG
    const trustRow = await User.findOne({ attributes: [[fn('AVG', col('trustScore')), 'avg']], raw: true });
    const avgTrustScore = Math.round(parseFloat(trustRow?.avg) || 50);

    // ── Security (Mongo + PG) ──
    let securityEvents24h = 0, systemErrors24h = 0;
    try {
      securityEvents24h = await SystemEvent.countDocuments({ category: 'security', createdAt: { $gte: dayAgo } });
      systemErrors24h = await SystemEvent.countDocuments({ severity: { $in: ['error', 'critical'] }, createdAt: { $gte: dayAgo } });
    } catch (_) {}

    const [loginsToday, failedLoginsToday] = await Promise.all([
      AuditLog.count({ where: { action: 'login', createdAt: { [Op.gte]: dayAgo } } }),
      AuditLog.count({ where: { action: 'login', outcome: 'failure', createdAt: { [Op.gte]: dayAgo } } }),
    ]);

    res.json({
      users: { total, tenants, landlords, admins, verified, locked, premium, activeToday, activeWeek, activeMonth, registeredToday, registeredWeek, registeredMonth, tosAccepted },
      listings: { active, inactive, avgPrice: Math.round(parseFloat(avgPriceRow?.avg) || 0), totalViews, totalLikes, topCities },
      payments: { totalLedgerRows, paid: paidRows, pending: pendingRows, overdue: overdueRows, paidAmountIls: Math.round(paidAmount), overdueAmountIls: Math.round(overdueAmount), invoiceCount },
      contracts: { active: contractActive, pendingSigning, ended: contractEnded, expiring: contractExpiring, amendments, guarantorsApproved, guarantorsPending },
      interactions: { totalSwipes, swipesToday, swipesWeek, likes, dislikes, superlikes, avgSeenDurationMs: Math.round(parseFloat(avgSeenRow?.avg) || 0), matchesActive, matchesPending, matchesExpired },
      maintenance: { open: mtOpen, inProgress: mtInProgress, waitingInvoice: mtWaiting, closedThisMonth: mtClosed },
      engagement: { avgTrustScore, avgPoints, levelDistribution, messagesToday },
      security: { securityEvents24h, systemErrors24h, loginsToday, failedLoginsToday },
    });
  } catch (err) { next(err); }
});

module.exports = router;
