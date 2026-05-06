const express = require('express');
const { User } = require('../models');

const router = express.Router();

// GET /api/auth/verify/:token
router.get('/verify/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 20) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    const user = await User.findOne({ where: { verificationToken: token } });
    if (!user) {
      return res.status(404).json({ error: 'Verification token not found or expired' });
    }

    await user.update({
      isVerified: true,
      verifiedAt: new Date(),
      verificationToken: null,
    });

    res.json({ ok: true, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
