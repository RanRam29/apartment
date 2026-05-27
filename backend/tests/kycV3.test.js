const crypto = require('crypto');
const { validateIsraeliId, verifyWebhookSignature } = require('../src/services/kycServiceV3');

describe('KYC Service v3', () => {
  describe('ID checksum validation', () => {
    it('validates a correct Israeli ID', () => {
      expect(validateIsraeliId('000000018')).toBe(true);
      expect(validateIsraeliId('123456780')).toBe(false);
    });
  });

  describe('HMAC webhook validation', () => {
    it('validates a correct HMAC-SHA256 signature', () => {
      const secret = 'test-webhook-secret';
      const payload = JSON.stringify({ data: { id: 'inq_123' } });
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('rejects an incorrect signature', () => {
      const secret = 'test-webhook-secret';
      const payload = JSON.stringify({ data: { id: 'inq_123' } });
      const wrongSig = 'deadbeef';
      const isValid = verifyWebhookSignature(payload, wrongSig, secret);
      expect(isValid).toBe(false);
    });
  });
});
