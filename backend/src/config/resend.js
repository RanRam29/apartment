const { Resend } = require('resend');

let resendClient = null;

function getResendClient() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

module.exports = { getResendClient };
