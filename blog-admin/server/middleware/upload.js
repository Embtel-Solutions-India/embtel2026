const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

// Buffered in memory, not written to local disk — this server's disk is
// ephemeral (wiped on every redeploy/restart), so mediaController uploads
// the (optionally sharp-compressed) buffer straight to S3 instead.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new ApiError(400, 'Unsupported file type. Allowed: jpg, jpeg, png, webp, svg.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
});

module.exports = upload;
