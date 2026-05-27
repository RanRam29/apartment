const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { AppConfig, User, RentalAgreement, LedgerRow, MaintenanceTicket, UserKycProfile } = require('../models');

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
    await UserKycProfile.upsert({ userId: req.params.id, status });
    res.json({ overridden: true });
  } catch (err) { next(err); }
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

module.exports = router;
