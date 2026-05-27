function requireTos(req, res, next) {
  if (process.env.NODE_ENV === 'test' && !req.headers['x-test-enforce-tos']) {
    return next();
  }
  if (req.user?.role === 'admin') return next();
  if (!req.user?.tosAcceptedAt) {
    return res.status(403).json({
      error: 'Terms of Service not accepted',
      code: 'TOS_REQUIRED',
    });
  }
  next();
}

module.exports = { requireTos };
