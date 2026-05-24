const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.resolve(path.join(__dirname, '../../uploads/contracts'));

/** Stored filenames must be a single path segment (multer-generated). */
const SAFE_FILENAME = /^[\w.-]+$/;

function ensureDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function isSafeStoredFilename(name) {
  if (typeof name !== 'string' || !name) return false;
  const base = path.basename(name);
  if (base !== name || base.includes('..')) return false;
  return SAFE_FILENAME.test(base);
}

/** Resolve a DB-stored filename to an absolute path confined to UPLOAD_DIR. */
function resolveUploadFilePath(storedFilename) {
  if (!isSafeStoredFilename(storedFilename)) return null;
  const resolved = path.resolve(UPLOAD_DIR, storedFilename);
  const uploadRoot = path.resolve(UPLOAD_DIR);
  if (resolved !== uploadRoot && !resolved.startsWith(`${uploadRoot}${path.sep}`)) {
    return null;
  }
  return resolved;
}

/** Delete a file only when it lives under UPLOAD_DIR (blocks path traversal). */
function safeUnlinkUpload(filePath) {
  if (!filePath) return;
  const resolved = path.resolve(filePath);
  const uploadRoot = path.resolve(UPLOAD_DIR);
  if (resolved !== uploadRoot && !resolved.startsWith(`${uploadRoot}${path.sep}`)) {
    return;
  }
  try {
    fs.unlinkSync(resolved);
  } catch {
    /* ignore missing file */
  }
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

module.exports = {
  contractDocumentUpload,
  UPLOAD_DIR,
  isSafeStoredFilename,
  resolveUploadFilePath,
  safeUnlinkUpload,
};
