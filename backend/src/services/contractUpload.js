const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/contracts');

function ensureDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const contractDocumentUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      ensureDir();
      cb(null, UPLOAD_DIR);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname) || '.pdf';
      cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      return cb(null, true);
    }
    const err = new Error('רק קבצי PDF או Word (DOC/DOCX) מותרים');
    err.status = 415;
    err.code = 'INVALID_DOC_TYPE';
    cb(err);
  },
});

module.exports = { contractDocumentUpload, UPLOAD_DIR };
