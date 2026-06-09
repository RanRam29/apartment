const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createR2Client, BUCKETS } = require('../config/r2');

const client = createR2Client();
const PRESIGN_EXPIRY_SECONDS = 300;

async function uploadFile(bucket, key, buffer, contentType) {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return { bucket, key };
}

async function getPresignedUrl(bucket, key) {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
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
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function getPresignedUploadUrl(bucket, key, contentType) {
  return getSignedUrl(client, new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  }), { expiresIn: PRESIGN_EXPIRY_SECONDS });
}

module.exports = { uploadFile, getPresignedUrl, deleteFile, getPresignedUploadUrl, BUCKETS };
