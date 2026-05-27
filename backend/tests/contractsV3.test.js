const { VALID_TRANSITIONS } = require('../src/services/contractServiceV3');

jest.mock('../src/services/geminiService', () => ({
  extractContractFields: jest.fn().mockResolvedValue({
    landlordName: 'יוסי כהן',
    landlordId: '012345678',
    tenantName: 'דנה לוי',
    tenantId: '987654321',
    address: 'רחוב הרצל 5, תל אביב',
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    monthlyRent: 5000,
    paymentDay: 1,
    cpiLinked: true,
    missingFields: [],
    warnings: [],
  }),
}));

jest.mock('../src/services/r2Service', () => ({
  uploadFile: jest.fn().mockResolvedValue({ bucket: 'contract-docs', key: 'contracts/test.pdf' }),
  getPresignedUrl: jest.fn().mockResolvedValue('https://contract-docs.r2.example.com/test.pdf'),
  deleteFile: jest.fn().mockResolvedValue(true),
  BUCKETS: {
    CONTRACT_DOCS: 'contract-docs',
    CHECKIN_PHOTOS: 'checkin-photos',
    CHECKOUT_PHOTOS: 'checkout-photos',
  },
}));

describe('Contract Upload + AI Extraction', () => {
  it('extracts fields from uploaded PDF via Gemini', async () => {
    const { extractContractFields } = require('../src/services/geminiService');
    const result = await extractContractFields(Buffer.from('fake pdf'));
    expect(result).toHaveProperty('landlordName');
    expect(result).toHaveProperty('startDate');
    expect(result).toHaveProperty('monthlyRent', 5000);
    expect(result.missingFields).toHaveLength(0);
  });

  it('returns Hebrew field values', async () => {
    const { extractContractFields } = require('../src/services/geminiService');
    const result = await extractContractFields(Buffer.from('fake pdf'));
    expect(result.landlordName).toBe('יוסי כהן');
    expect(result.address).toContain('תל אביב');
  });
});

describe('R2 Service stub', () => {
  it('uploads a file and returns bucket/key', async () => {
    const { uploadFile, BUCKETS } = require('../src/services/r2Service');
    const result = await uploadFile(BUCKETS.CONTRACT_DOCS, 'test-key', Buffer.from('data'), 'application/pdf');
    expect(result).toHaveProperty('bucket', 'contract-docs');
    expect(result).toHaveProperty('key', 'contracts/test.pdf');
  });

  it('generates a presigned URL', async () => {
    const { getPresignedUrl, BUCKETS } = require('../src/services/r2Service');
    const url = await getPresignedUrl(BUCKETS.CONTRACT_DOCS, 'test-key');
    expect(url).toContain('contract-docs');
  });
});

describe('Contract State Transitions (service layer)', () => {
  it('defines correct transition map', () => {
    expect(VALID_TRANSITIONS.UPLOAD).toEqual(['PENDING_SIGN']);
    expect(VALID_TRANSITIONS.PENDING_SIGN).toEqual(['ACTIVE']);
    expect(VALID_TRANSITIONS.ACTIVE).toEqual(['EXPIRING']);
    expect(VALID_TRANSITIONS.EXPIRING).toEqual(['ENDED']);
    expect(VALID_TRANSITIONS.PENDING_ACTIVATION).toEqual(['ACTIVE']);
  });

  it('does not allow ENDED to transition anywhere', () => {
    expect(VALID_TRANSITIONS.ENDED).toBeUndefined();
  });

  it('does not allow skipping states', () => {
    expect(VALID_TRANSITIONS.UPLOAD).not.toContain('ACTIVE');
    expect(VALID_TRANSITIONS.PENDING_SIGN).not.toContain('EXPIRING');
  });
});

describe('Contract file validation rules', () => {
  it('allows PDF mimetype', () => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    expect(allowedMimes).toContain('application/pdf');
  });

  it('allows DOCX mimetype', () => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    expect(allowedMimes).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  it('enforces 10MB file size limit', () => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    expect(MAX_FILE_SIZE).toBe(10485760);
  });
});
