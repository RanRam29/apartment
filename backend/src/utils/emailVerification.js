function isEmailVerificationEnforced() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
    process.env.NODE_ENV === 'test';
}

module.exports = { isEmailVerificationEnforced };
