jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://presigned.example.com/file.pdf'),
}));

describe('r2Service', () => {
  beforeEach(() => {
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    jest.resetModules();
  });

  it('uploads a file to the correct bucket and returns the key', async () => {
    const { uploadFile } = require('../src/services/r2Service');
    const buffer = Buffer.from('test content');
    const result = await uploadFile('property-images', 'test-key.jpg', buffer, 'image/jpeg');
    expect(result).toHaveProperty('key', 'test-key.jpg');
    expect(result).toHaveProperty('bucket', 'property-images');
  });

  it('generates a presigned URL', async () => {
    const { getPresignedUrl } = require('../src/services/r2Service');
    const url = await getPresignedUrl('contract-docs', 'doc.pdf');
    expect(url).toContain('presigned');
  });

  it('deletes a file from R2', async () => {
    const { deleteFile } = require('../src/services/r2Service');
    await expect(deleteFile('archive', 'old.pdf')).resolves.not.toThrow();
  });

  it('exposes correct bucket names', async () => {
    const { BUCKETS } = require('../src/services/r2Service');
    expect(BUCKETS.CONTRACT_DOCS).toBe('contract-docs');
    expect(BUCKETS.PAYMENT_RECEIPTS).toBe('payment-receipts');
    expect(BUCKETS.CHECKIN_PHOTOS).toBe('checkin-photos');
  });
});
