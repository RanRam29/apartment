jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'email-123' }),
    },
  })),
}));

describe('resendService', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.RESEND_FROM_EMAIL = 'noreply@dirapp.co.il';
    jest.resetModules();
  });

  it('sends a guarantor invitation email', async () => {
    const { sendGuarantorInvite } = require('../src/services/resendService');
    const result = await sendGuarantorInvite({
      to: 'guarantor@example.com',
      landlordName: 'יוסי כהן',
      propertyAddress: 'רחוב הרצל 5, תל אביב',
      rentAmount: 5000,
      period: '01/07/2026 - 30/06/2027',
      link: 'https://dirapp.co.il/guarantor/abc123',
    });
    expect(result).toHaveProperty('id');
  });

  it('sends a payment reminder email', async () => {
    const { sendPaymentReminder } = require('../src/services/resendService');
    const result = await sendPaymentReminder({
      to: 'tenant@example.com',
      amount: 5000,
      dueDate: '2026-07-01',
      period: 'יולי 2026',
    });
    expect(result).toHaveProperty('id');
  });

  it('sends a generic notification email', async () => {
    const { sendNotificationEmail } = require('../src/services/resendService');
    const result = await sendNotificationEmail({
      to: 'user@example.com',
      subject: 'עדכון חוזה',
      html: '<p>החוזה שלך אושר</p>',
    });
    expect(result).toHaveProperty('id');
  });
});
