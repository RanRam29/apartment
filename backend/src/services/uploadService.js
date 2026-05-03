const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const logger = require('../utils/logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

async function uploadToCloudinary(fileBuffer, folder = 'apartments') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      }
    );
    bufferToStream(fileBuffer).pipe(uploadStream);
  });
}

async function uploadMany(files, folder = 'apartments') {
  const results = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer, folder)));
  logger.info(`Uploaded ${results.length} images to Cloudinary`);
  return results;
}

module.exports = { upload, uploadMany };
