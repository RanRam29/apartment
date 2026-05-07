const logger = require('../utils/logger');

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    logger.warn('nodemailer is not installed; falling back to logged verification links');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendVerificationEmail(email, verificationToken) {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/api/auth/verify/${verificationToken}`;
  const from = process.env.SMTP_FROM || 'no-reply@dirapp.local';
  const transport = buildTransport();

  if (transport) {
    await transport.sendMail({
      from,
      to: email,
      subject: 'Verify your DirApp email',
      text: `Verify your email by opening: ${verificationUrl}`,
      html: `<p>Welcome to DirApp.</p><p>Verify your email: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
    });
    return;
  }

  logger.info(`SMTP not configured. Verification link for ${email}: ${verificationUrl}`);
}

module.exports = { sendVerificationEmail };
