const logger = require('../utils/logger');

const BUCKETS = {
  CONTRACT_DOCS: 'contract-docs',
  CHECKIN_PHOTOS: 'checkin-photos',
  CHECKOUT_PHOTOS: 'checkout-photos',
};

async function uploadFile(bucket, key, buffer, mimeType) {
  logger.info(`r2Service.uploadFile stub: bucket=${bucket} key=${key} size=${buffer.length} mime=${mimeType}`);
  return { bucket, key };
}

async function getPresignedUrl(bucket, key, expiresIn = 3600) {
  logger.info(`r2Service.getPresignedUrl stub: bucket=${bucket} key=${key}`);
  return `https://${bucket}.r2.example.com/${key}?expires=${expiresIn}`;
}

async function deleteFile(bucket, key) {
  logger.info(`r2Service.deleteFile stub: bucket=${bucket} key=${key}`);
  return true;
}

module.exports = { uploadFile, getPresignedUrl, deleteFile, BUCKETS };
