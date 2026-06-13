const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  AppConfig,
  User,
  RentalAgreement,
  LedgerRow,
  MaintenanceTicket,
  UserKycProfile,
  Apartment,
  TicketInvoice,
  AgreementParty,
  AgreementRoom,
  OwnershipVerification,
  Match,
  Swipe,
  ScheduledNotification,
} = require('../models');
const { cancelReminder } = require('../services/notificationService');

router.use(authenticate);
router.use(requireRole('admin'));

// Config management
router.get('/config', async (req, res, next) => {
  try {
    const configs = await AppConfig.findAll();
    res.json(configs);
  } catch (err) { next(err); }
});

router.put('/config/:key', async (req, res, next) => {
  try {
    const [config] = await AppConfig.upsert({ key: req.params.key, value: req.body.value });
    res.json(config);
  } catch (err) { next(err); }
});

// User management
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const users = await User.findAndCountAll({
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
      include: [{ model: UserKycProfile, as: 'kycProfile', attributes: ['status'] }],
    });
    res.json(users);
  } catch (err) { next(err); }
});

router.post('/users/:id/unlock', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.update({ isLocked: false, blockedCount: 0 });
    res.json({ unlocked: true });
  } catch (err) { next(err); }
});

router.post('/users/:id/kyc-override', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (status === 'NONE') {
      await UserKycProfile.destroy({ where: { userId: req.params.id } });
    } else {
      const [profile, created] = await UserKycProfile.findOrCreate({
        where: { userId: req.params.id },
        defaults: { status }
      });
      if (!created) {
        await profile.update({ status });
      }
    }
    res.json({ overridden: true });
  } catch (err) { next(err); }
});

// Update User (Admin Edit)
router.put('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      activeRole,
      trustScore,
      isPremium,
      isVerified,
      isLocked,
      blockedCount,
      password,
    } = req.body;

    const updateData = {};
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 10) {
        return res.status(400).json({ error: 'Password must be a string of at least 10 characters' });
      }
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (activeRole !== undefined) updateData.activeRole = activeRole;
    if (trustScore !== undefined) {
      const ts = Number(trustScore);
      if (!Number.isInteger(ts) || ts < 0 || ts > 100) {
        return res.status(422).json({ error: 'trustScore must be an integer between 0 and 100' });
      }
      updateData.trustScore = ts;
    }
    if (isPremium !== undefined) updateData.isPremium = !!isPremium;
    if (isVerified !== undefined) updateData.isVerified = !!isVerified;
    if (isLocked !== undefined) updateData.isLocked = !!isLocked;
    if (blockedCount !== undefined) {
      const bc = Number(blockedCount);
      if (!Number.isInteger(bc) || bc < 0) {
        return res.status(422).json({ error: 'blockedCount must be a non-negative integer' });
      }
      updateData.blockedCount = bc;
    }

    await user.update(updateData);
    
    const updatedUser = await User.findByPk(user.id, {
      include: [{ model: UserKycProfile, as: 'kycProfile', attributes: ['status'] }],
    });
    
    res.json(updatedUser);
  } catch (err) { next(err); }
});

// Delete User (Admin Cascading Delete)
router.delete('/users/:id', async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.params.id;
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // 1. Delete matches
    // No .catch() here: a failed statement aborts the Postgres transaction,
    // so swallowing it only masks the root cause of the rollback.
    await Match.destroy({ where: { [Op.or]: [{ tenantId: userId }, { landlordId: userId }] }, transaction });

    // 2. Delete swipes
    await Swipe.destroy({ where: { tenantId: userId }, transaction });

    // 3. Delete agreements, maintenance tickets, ledger rows
    const userAgreements = await RentalAgreement.findAll({
      where: { landlordId: userId },
      attributes: ['id'],
      transaction
    });
    const agreementIds = userAgreements.map(a => a.id);
    
    const partyAgreements = await AgreementParty.findAll({
      where: { userId },
      attributes: ['agreementId'],
      transaction
    });
    partyAgreements.forEach(pa => {
      if (!agreementIds.includes(pa.agreementId)) {
        agreementIds.push(pa.agreementId);
      }
    });

    if (agreementIds.length > 0) {
      const tickets = await MaintenanceTicket.findAll({
        where: { agreementId: { [Op.in]: agreementIds } },
        attributes: ['id'],
        transaction
      });
      const ticketIds = tickets.map(t => t.id);
      
      if (ticketIds.length > 0) {
        await TicketInvoice.destroy({ where: { ticketId: { [Op.in]: ticketIds } }, transaction });
        await MaintenanceTicket.destroy({ where: { id: { [Op.in]: ticketIds } }, transaction });
      }
      
      await LedgerRow.destroy({ where: { agreementId: { [Op.in]: agreementIds } }, transaction });
      await AgreementParty.destroy({ where: { agreementId: { [Op.in]: agreementIds } }, transaction });
      await AgreementRoom.destroy({ where: { agreementId: { [Op.in]: agreementIds } }, transaction });
      await OwnershipVerification.destroy({ where: { agreementId: { [Op.in]: agreementIds } }, transaction });
      await RentalAgreement.destroy({ where: { id: { [Op.in]: agreementIds } }, transaction });
    }

    // 4. Delete user specific rows
    await AgreementParty.destroy({ where: { userId }, transaction });
    await UserKycProfile.destroy({ where: { userId }, transaction });

    // 5. Delete listings (apartments) owned by user
    const apartments = await Apartment.findAll({ where: { landlordId: userId }, attributes: ['id'], transaction });
    const apartmentIds = apartments.map(ap => ap.id);
    if (apartmentIds.length > 0) {
      await Swipe.destroy({ where: { apartmentId: { [Op.in]: apartmentIds } }, transaction });
      await Match.destroy({ where: { apartmentId: { [Op.in]: apartmentIds } }, transaction });
      await Apartment.destroy({ where: { id: { [Op.in]: apartmentIds } }, transaction });
    }

    // 6. Finally destroy user
    await user.destroy({ transaction });

    await transaction.commit();
    res.json({ deleted: true });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
});

// Contract overview
router.get('/contracts', async (req, res, next) => {
  try {
    const contracts = await RentalAgreement.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(contracts);
  } catch (err) { next(err); }
});

router.post('/contracts/:id/override-status', async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Not found' });
    await agreement.update({ status: req.body.status });
    res.json(agreement);
  } catch (err) { next(err); }
});

// Ledger overview
router.get('/ledgers', async (req, res, next) => {
  try {
    const ledgers = await LedgerRow.findAll({
      order: [['dueDate', 'DESC']],
      limit: 200,
    });
    res.json(ledgers);
  } catch (err) { next(err); }
});

// Maintenance overview
router.get('/maintenance', async (req, res, next) => {
  try {
    const tickets = await MaintenanceTicket.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(tickets);
  } catch (err) { next(err); }
});

router.post('/maintenance/:id/close', async (req, res, next) => {
  try {
    await MaintenanceTicket.update({ status: 'CLOSED' }, { where: { id: req.params.id } });
    res.json({ closed: true });
  } catch (err) { next(err); }
});

// GET /api/v3/admin/stats — Admin stats summary
router.get('/stats', async (req, res, next) => {
  try {
    const userCount = await User.count();
    const agreementCount = await RentalAgreement.count();
    const activeApartmentCount = await Apartment.count({ where: { isActive: true } });
    res.json({
      users: userCount,
      agreements: agreementCount,
      activeApartments: activeApartmentCount,
    });
  } catch (err) { next(err); }
});

// POST /api/v3/admin/kyc/:id/override — KYC verification override
router.post('/kyc/:id/override', async (req, res, next) => {
  try {
    const { status = 'APPROVED' } = req.body;
    if (status === 'NONE') {
      await UserKycProfile.destroy({ where: { userId: req.params.id } });
    } else {
      const [profile, created] = await UserKycProfile.findOrCreate({
        where: { userId: req.params.id },
        defaults: { status }
      });
      if (!created) {
        await profile.update({ status });
      }
    }
    res.json({ overridden: true });
  } catch (err) { next(err); }
});

// PATCH /api/v3/admin/config — Patch config values
router.patch('/config', async (req, res, next) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required' });
    const [config] = await AppConfig.upsert({ key, value });
    res.json(config);
  } catch (err) { next(err); }
});

// GET /api/v3/admin/scheduled-notifications?status=&page=&limit=
router.get('/scheduled-notifications', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (status) where.status = status;

    const result = await ScheduledNotification.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] }],
      order: [['fireAt', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 50, 100),
      offset: (Math.max(parseInt(page, 10) || 1, 1) - 1) * (parseInt(limit, 10) || 50),
    });

    res.json({
      rows: result.rows,
      total: result.count,
      page: parseInt(page, 10) || 1,
      totalPages: Math.ceil(result.count / (parseInt(limit, 10) || 50)),
    });
  } catch (err) { next(err); }
});

// POST /api/v3/admin/scheduled-notifications/:id/cancel
router.post('/scheduled-notifications/:id/cancel', async (req, res, next) => {
  try {
    const row = await ScheduledNotification.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Scheduled notification not found' });
    if (row.status !== 'SCHEDULED') {
      return res.status(422).json({ error: 'Only SCHEDULED notifications can be cancelled' });
    }

    const cancelled = await cancelReminder({ id: row.id });
    if (!cancelled) {
      return res.status(422).json({ error: 'Notification could not be cancelled' });
    }

    await row.reload();
    res.json(row);
  } catch (err) { next(err); }
});

module.exports = router;
