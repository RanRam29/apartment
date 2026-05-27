const { S3Client } = require('@aws-sdk/client-s3');

const BUCKETS = {
  PROPERTY_IMAGES: 'property-images',
  CONTRACT_DOCS: 'contract-docs',
  CHECKIN_PHOTOS: 'checkin-photos',
  CHECKOUT_PHOTOS: 'checkout-photos',
  PAYMENT_RECEIPTS: 'payment-receipts',
  ARCHIVE: 'archive',
};

function createR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

module.exports = { createR2Client, BUCKETS };
