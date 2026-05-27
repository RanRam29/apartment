const { sendEmail } = require('./resendService');
const logger = require('../utils/logger');

async function sendVerificationEmail({ to, verificationUrl }) {
  if (!to || !verificationUrl) {
    throw new Error('sendVerificationEmail requires "to" and "verificationUrl"');
  }

  try {
    await sendEmail({
      to,
      subject: 'Verify your DirApp email',
      html: `<p>Welcome to DirApp.</p><p>Verify your email: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
    });
  } catch (err) {
    logger.error('Error sending verification email via Resend', { error: err.message });
    throw err;
  }
}

module.exports = { sendVerificationEmail };
