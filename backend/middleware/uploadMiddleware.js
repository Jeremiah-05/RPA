// backend/middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure receipts upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration with sanitized timestamp naming
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  }
});

// File type filter: accept PDF, JPG, JPEG, PNG
function fileFilter(req, file, cb) {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type (${ext}). Only PDF, JPG, and PNG files are accepted as receipts.`), false);
  }
}

const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5;

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024 // 5 MB limit
  }
});

module.exports = upload;
