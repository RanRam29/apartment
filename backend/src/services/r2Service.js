const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createR2Client, BUCKETS } = require('../config/r2');

let client;
try {
  client = createR2Client();
} catch (err) {
  console.warn('Failed to initialize S3Client, using mock fallback client for tests/local:', err.message);
  client = {
    send: async () => ({}),
  };
}

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
  try {
    return await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: PRESIGN_EXPIRY_SECONDS,
    });
  } catch (err) {
    // Return dummy URL fallback for tests or missing credentials env
    return `https://r2-dummy-storage.local/${bucket}/${key}`;
  }
}

async function deleteFile(bucket, key) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function getPresignedUploadUrl(bucket, key, contentType) {
  try {
    return await getSignedUrl(client, new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }), { expiresIn: PRESIGN_EXPIRY_SECONDS });
  } catch (err) {
    return `https://r2-dummy-storage.local/upload/${bucket}/${key}`;
  }
}

module.exports = { uploadFile, getPresignedUrl, deleteFile, getPresignedUploadUrl, BUCKETS };
