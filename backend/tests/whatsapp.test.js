const request = require('supertest');

// Mock external dependencies before requiring app
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ id: 'mock' }) },
  })),
}));

jest.mock('../src/services/whatsappApiClient', () => ({
  sendTemplate: jest.fn().mockResolvedValue('wamid_test_123'),
  sendText: jest.fn().mockResolvedValue('wamid_text_123'),
  sendInteractive: jest.fn().mockResolvedValue('wamid_int_123'),
  markAsRead: jest.fn().mockResolvedValue(),
  downloadMedia: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
}));

jest.mock('../src/services/r2Service', () => ({
  uploadFile: jest.fn().mockResolvedValue({ bucket: 'test', key: 'test' }),
  getPresignedUrl: jest.fn(),
  deleteFile: jest.fn(),
  getPresignedUploadUrl: jest.fn(),
  BUCKETS: { CHECKIN_PHOTOS: 'checkin-photos' },
}));

jest.mock('../src/config/redis', () => ({
  initRedis: jest.fn(),
  getRedisClient: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  })),
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(),
  cacheDel: jest.fn().mockResolvedValue(),
}));

const app = require('../src/app');
const waApi = require('../src/services/whatsappApiClient');
const { TEMPLATES } = require('../src/services/whatsappTemplates');
const waNotify = require('../src/services/whatsappNotificationService');

describe('WhatsApp Integration', () => {
  describe('GET /webhooks/whatsapp — Verification', () => {
    it('returns challenge on valid verify token', async () => {
      const res = await request(app)
        .get('/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.challenge': '123456',
          'hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN || 'dirapp_verify_token',
        });
      expect(res.status).toBe(200);
      expect(res.text).toBe('123456');
    });

    it('returns 403 on invalid verify token', async () => {
      const res = await request(app)
        .get('/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.challenge': '123456',
          'hub.verify_token': 'wrong_token',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /webhooks/whatsapp — Inbound message', () => {
    it('returns 200 for valid webhook payload', async () => {
      const res = await request(app)
        .post('/webhooks/whatsapp')
        .send({
          object: 'whatsapp_business_account',
          entry: [{
            changes: [{
              value: {
                messages: [{
                  id: 'wamid_inbound_1',
                  from: '972501234567',
                  type: 'text',
                  text: { body: 'עזרה' },
                }],
                contacts: [{ profile: { name: 'Test' }, wa_id: '972501234567' }],
              },
            }],
          }],
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('ignores non-whatsapp payloads', async () => {
      const res = await request(app)
        .post('/webhooks/whatsapp')
        .send({ object: 'instagram' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /webhooks/whatsapp — Status update', () => {
    it('processes delivery status updates', async () => {
      const res = await request(app)
        .post('/webhooks/whatsapp')
        .send({
          object: 'whatsapp_business_account',
          entry: [{
            changes: [{
              value: {
                statuses: [{
                  id: 'wamid_test_123',
                  status: 'delivered',
                  timestamp: '1234567890',
                  recipient_id: '972501234567',
                }],
              },
            }],
          }],
        });
      expect(res.status).toBe(200);
    });
  });

  describe('Templates Registry', () => {
    it('has all 8 templates defined', () => {
      const expected = [
        'PAYMENT_REMINDER_3D', 'PAYMENT_REMINDER_TODAY', 'PAYMENT_OVERDUE',
        'MAINTENANCE_OPENED', 'MAINTENANCE_ASSIGNED', 'MAINTENANCE_RESOLVED',
        'TENANT_INVITE', 'CONTRACT_RENEWAL_60D',
      ];
      for (const key of expected) {
        expect(TEMPLATES[key]).toBeDefined();
        expect(TEMPLATES[key].name).toMatch(/^dirapp_/);
        expect(TEMPLATES[key].language).toBe('he');
        expect(typeof TEMPLATES[key].buildComponents).toBe('function');
      }
    });

    it('builds correct component structure', () => {
      const components = TEMPLATES.PAYMENT_REMINDER_3D.buildComponents('ראן', '3500', '2026-06-15');
      expect(components).toHaveLength(1);
      expect(components[0].type).toBe('body');
      expect(components[0].parameters).toHaveLength(3);
      expect(components[0].parameters[0].text).toBe('ראן');
    });
  });

  describe('Notification Service', () => {
    beforeEach(() => jest.clearAllMocks());

    it('sendPaymentReminderToday calls sendTemplate', async () => {
      const wamid = await waNotify.sendPaymentReminderToday({
        phoneNumber: '+972501234567',
        tenantName: 'ראן',
        amount: '3500',
        contractId: 'c-123',
        userId: 'u-123',
      });
      expect(waApi.sendTemplate).toHaveBeenCalledTimes(1);
      expect(waApi.sendTemplate).toHaveBeenCalledWith(expect.objectContaining({
        phoneNumber: '+972501234567',
        templateName: 'dirapp_payment_reminder_today',
        languageCode: 'he',
      }));
      expect(wamid).toBe('wamid_test_123');
    });

    it('sendMaintenanceOpened calls sendTemplate', async () => {
      const wamid = await waNotify.sendMaintenanceOpened({
        phoneNumber: '+972501234567',
        ticketNumber: 'MT-ABC123',
        address: 'הרצל 5, תל אביב',
        contractId: 'c-123',
        userId: 'u-123',
      });
      expect(waApi.sendTemplate).toHaveBeenCalledWith(expect.objectContaining({
        templateName: 'dirapp_maintenance_opened',
      }));
      expect(wamid).toBe('wamid_test_123');
    });

    it('sendContractRenewal60Days calls sendTemplate', async () => {
      await waNotify.sendContractRenewal60Days({
        phoneNumber: '+972501234567',
        recipientName: 'ראן',
        expiryDate: '2026-08-01',
        address: 'הרצל 5',
        contractId: 'c-123',
        userId: 'u-123',
      });
      expect(waApi.sendTemplate).toHaveBeenCalledWith(expect.objectContaining({
        templateName: 'dirapp_contract_renewal_60d',
      }));
    });

    it('handles send failure gracefully', async () => {
      waApi.sendTemplate.mockRejectedValueOnce(new Error('Meta 500'));
      const wamid = await waNotify.sendPaymentReminderToday({
        phoneNumber: '+972501234567',
        tenantName: 'ראן',
        amount: '3500',
        contractId: 'c-123',
        userId: 'u-123',
      });
      expect(wamid).toBeNull();
    });
  });

  describe('API Client', () => {
    it('sendText sends correct payload', async () => {
      const wamid = await waApi.sendText({ phoneNumber: '+972501234567', body: 'test' });
      expect(wamid).toBe('wamid_text_123');
    });

    it('sendInteractive sends correct payload', async () => {
      const wamid = await waApi.sendInteractive({
        phoneNumber: '+972501234567',
        bodyText: 'test question',
        buttons: [{ id: 'btn1', title: 'Yes' }],
      });
      expect(wamid).toBe('wamid_int_123');
    });
  });
});
