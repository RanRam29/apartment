const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createR2Client, BUCKETS } = require('../config/r2');
const logger = require('../utils/logger');

const client = createR2Client();
const PRESIGN_EXPIRY_SECONDS = 300;

function r2Configured() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  return (
    accountId && accountId !== 'your_account_id' && accountId !== '' &&
    accessKeyId && accessKeyId !== 'your_access_key_id' && accessKeyId !== '' &&
    secretAccessKey && secretAccessKey !== 'your_secret_access_key' && secretAccessKey !== ''
  );
}

async function uploadFile(bucket, key, buffer, contentType) {
  if (!r2Configured()) {
    logger.warn(`R2 not configured — skipping upload for key: ${key}. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY to enable Cloudflare R2.`);
    return { bucket, key };
  }
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return { bucket, key };
}

async function getPresignedUrl(bucket, key) {
  if (!r2Configured()) {
    return null;
  }
  if (!bucket || !key) return null;
  try {
    return await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: PRESIGN_EXPIRY_SECONDS,
    });
  } catch {
    return null;
  }
}

async function deleteFile(bucket, key) {
  if (!r2Configured()) {
    logger.warn(`R2 not configured — skipping delete for key: ${key}`);
    return;
  }
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function getPresignedUploadUrl(bucket, key, contentType) {
  if (!r2Configured()) {
    return null;
  }
  return getSignedUrl(client, new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  }), { expiresIn: PRESIGN_EXPIRY_SECONDS });
}

module.exports = { uploadFile, getPresignedUrl, deleteFile, getPresignedUploadUrl, BUCKETS };
