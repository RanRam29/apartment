const { sendEmail } = require('./resendService');
const logger = require('../utils/logger');

async function sendVerificationEmail({ to, verificationUrl }) {
  if (!to || !verificationUrl) {
    throw new Error('sendVerificationEmail requires "to" and "verificationUrl"');
  }

  try {
    await sendEmail({
      to,
      subject: 'אמת את כתובת האימייל שלך ב-DirApp 🔑',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 32px; background-color: #FAFAFA; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0;">
          <h2 style="color: #1E293B; font-size: 22px; font-weight: 800; margin-bottom: 16px; text-align: center;">ברוכים הבאים ל-DirApp! 🏠</h2>
          <p style="color: #475569; font-size: 15px; line-height: 24px; margin-bottom: 24px; text-align: right;">שלום,</p>
          <p style="color: #475569; font-size: 15px; line-height: 24px; margin-bottom: 24px; text-align: right;">תודה שהצטרפת ל-DirApp. על מנת להשלים את הרשמתך ולאבטח את חשבונך, אנא לחץ על הכפתור למטה כדי לאמת את כתובת האימייל שלך:</p>
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${verificationUrl}" style="background-color: #5F5CE5; color: #FFFFFF; padding: 14px 28px; border-radius: 12px; text-decoration: none; display: inline-block; font-size: 15px; font-weight: 700; box-shadow: 0 4px 6px -1px rgba(95, 92, 229, 0.2);">אמת את כתובת האימייל</a>
          </div>
          <p style="color: #64748B; font-size: 13px; line-height: 20px; text-align: right; border-top: 1px solid #E2E8F0; padding-top: 20px;">אם הכפתור לא עובד, ניתן להעתיק ולהדביק את הקישור הבא בדפדפן:</p>
          <p style="color: #5F5CE5; font-size: 13px; text-align: left; word-break: break-all;">${verificationUrl}</p>
          <p style="color: #94A3B8; font-size: 12px; text-align: center; margin-top: 32px; border-top: 1px dashed #E2E8F0; padding-top: 16px;">DirApp — פלטפורמת שכירות דירות דיגיטלית מתקדמת</p>
        </div>
      `,
    });
  } catch (err) {
    logger.error('Error sending verification email via Resend', { error: err.message });
    throw err;
  }
}

module.exports = { sendVerificationEmail };
