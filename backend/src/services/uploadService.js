const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');

// Store files in memory — send directly to Cloudinary
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

async function uploadToCloudinary(fileBuffer, folder = 'apartments') {
  const form = new FormData();
  form.append('file', fileBuffer, { filename: 'upload.jpg' });
  form.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);
  form.append('folder', folder);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const response = await axios.post(url, form, {
    headers: form.getHeaders(),
    timeout: 15000,
  });

  return {
    url: response.data.secure_url,
    publicId: response.data.public_id,
    width: response.data.width,
    height: response.data.height,
  };
}

async function uploadMany(files, folder = 'apartments') {
  const results = await Promise.all(
    files.map((f) => uploadToCloudinary(f.buffer, folder))
  );
  logger.info(`Uploaded ${results.length} images to Cloudinary`);
  return results;
}

module.exports = { upload, uploadMany };
