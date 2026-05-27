const { S3Client } = require('@aws-sdk/client-s3');

const BUCKETS = {
  PROPERTY_IMAGES: 'property-images',
  CONTRACT_DOCS: 'contract-docs',
  CHECKIN_PHOTOS: 'checkin-photos',
  PAYMENT_RECEIPTS: 'payment-receipts',
  ARCHIVE: 'archive',
};

function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID || 'dummy';
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || 'dummy',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'dummy',
    },
  });
}

module.exports = { createR2Client, BUCKETS };
