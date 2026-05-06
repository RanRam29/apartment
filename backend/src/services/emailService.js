const axios = require('axios');
const logger = require('../utils/logger');

const senderEmail = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM;
const sendgridApiKey = process.env.SENDGRID_API_KEY;

async function sendVerificationEmail({ to, verificationUrl }) {
  if (!to || !verificationUrl) {
    throw new Error('sendVerificationEmail requires "to" and "verificationUrl"');
  }

  // Keep local/dev setup non-blocking when SendGrid is not configured yet.
  if (!sendgridApiKey || !senderEmail) {
    logger.warn(`Verification email not sent (SendGrid not configured). Link for ${to}: ${verificationUrl}`);
    return { sent: false, reason: 'sendgrid_not_configured' };
  }

  await axios.post('https://api.sendgrid.com/v3/mail/send', {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: senderEmail },
    subject: 'Verify your DirApp account',
    content: [
      { type: 'text/plain', value: `Welcome to DirApp. Verify your account by opening: ${verificationUrl}` },
      {
        type: 'text/html',
        value: `
          <p>Welcome to <strong>DirApp</strong>.</p>
          <p>Please verify your account by clicking the link below:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        `,
      },
    ],
  }, {
    headers: {
      Authorization: `Bearer ${sendgridApiKey}`,
      'Content-Type': 'application/json',
    },
  });

  return { sent: true };
}

module.exports = { sendVerificationEmail };
