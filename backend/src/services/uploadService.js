const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { uploadFile, getPresignedUrl, BUCKETS } = require('./r2Service');
const logger = require('../utils/logger');

// Store files in memory — send directly to R2
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

async function uploadToR2(file, folder = 'apartments') {
  const originalName = file.originalname || 'upload.jpg';
  const key = `${folder}/${uuidv4()}-${originalName}`;
  const contentType = file.mimetype || 'image/jpeg';

  await uploadFile(BUCKETS.PROPERTY_IMAGES, key, file.buffer, contentType);
  const presignedUrl = await getPresignedUrl(BUCKETS.PROPERTY_IMAGES, key);

  return {
    url: presignedUrl,
    publicId: key,
    width: 800, // Dummy dimensions matching Cloudinary signature
    height: 600,
  };
}

async function uploadMany(files, folder = 'apartments') {
  const results = await Promise.all(
    files.map((f) => uploadToR2(f, folder))
  );
  logger.info(`Uploaded ${results.length} images to R2`);
  return results;
}

module.exports = { upload, uploadMany };

