const { getResendClient } = require('../config/resend');

const FROM = process.env.RESEND_FROM_EMAIL || 'DirApp <noreply@dirapp.co.il>';

async function sendEmail({ to, subject, html }) {
  const resend = getResendClient();
  return resend.emails.send({ from: FROM, to, subject, html });
}

async function sendGuarantorInvite({ to, landlordName, propertyAddress, rentAmount, period, link }) {
  return sendEmail({
    to,
    subject: `הזמנה לערבות שכירות — ${propertyAddress}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>הזמנה לערבות שכירות</h2>
        <p>שלום,</p>
        <p>${landlordName} מזמין אותך לשמש ערב לשכירות בנכס:</p>
        <ul>
          <li><strong>כתובת:</strong> ${propertyAddress}</li>
          <li><strong>שכירות חודשית:</strong> ₪${rentAmount}</li>
          <li><strong>תקופה:</strong> ${period}</li>
        </ul>
        <p><a href="${link}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">אישור ערבות</a></p>
        <p>קישור זה תקף ל-5 ימים.</p>
        <p style="color:#666;font-size:12px;">DirApp — פלטפורמת שכירות דירות</p>
      </div>
    `,
  });
}

async function sendPaymentReminder({ to, amount, dueDate, period }) {
  return sendEmail({
    to,
    subject: `תזכורת תשלום שכירות — ${period}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>תזכורת תשלום</h2>
        <p>תשלום שכירות בסך ₪${amount} צפוי בתאריך ${dueDate} עבור ${period}.</p>
      </div>
    `,
  });
}

async function sendNotificationEmail({ to, subject, html }) {
  return sendEmail({ to, subject, html });
}

module.exports = { sendEmail, sendGuarantorInvite, sendPaymentReminder, sendNotificationEmail };
