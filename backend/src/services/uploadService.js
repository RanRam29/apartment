const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { uploadFile, BUCKETS } = require('./r2Service');
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

async function uploadToR2(fileBuffer, folder = 'apartments', originalname = 'upload.jpg', mimetype = 'image/jpeg') {
  const key = `${folder}/${uuidv4()}-${originalname}`;
  const bucket = BUCKETS.PROPERTY_IMAGES;
  await uploadFile(bucket, key, fileBuffer, mimetype);

  return {
    key,
    bucket,
  };
}

async function uploadMany(files, folder = 'apartments') {
  const results = await Promise.all(
    files.map((f) => uploadToR2(f.buffer, folder, f.originalname, f.mimetype))
  );
  logger.info(`Uploaded ${results.length} images to R2`);
  return results;
}

module.exports = { upload, uploadMany, uploadToR2 };
