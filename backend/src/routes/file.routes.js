const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authMiddleware } = require("../middleware/auth");

const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

// Configure S3
const s3Config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

const hasS3Keys = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
let s3;

if (hasS3Keys) {
  try {
    s3 = new S3Client(s3Config);
    console.log("AWS S3 Configured");
  } catch (error) {
    console.error("AWS S3 Configuration Error:", error);
  }
}

// Configure Storage Engine
const storage = hasS3Keys ? multerS3({
  s3: s3,
  bucket: process.env.AWS_BUCKET_NAME || 'my-app-uploads',
  acl: 'public-read',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `uploads/${uniqueSuffix}-${file.originalname}`);
  }
}) : multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Upload file
router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // If S3, location is the URL. If local, filename needs path.
    const fileUrl = req.file.location || `/uploads/${req.file.filename}`;

    res.json({
      url: fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload multiple files
router.post('/upload-multiple', authMiddleware, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));

    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create signed URL (placeholder)
router.post('/create-signed-url', authMiddleware, (req, res) => {
  try {
    const { filename, contentType } = req.body;
    // In production, generate actual signed URL for cloud storage
    const signedUrl = `/api/files/upload?filename=${encodeURIComponent(filename)}`;

    res.json({ signedUrl, publicUrl: `/uploads/${filename}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Extract data from file (placeholder)
router.post('/extract-data', authMiddleware, (req, res) => {
  try {
    const { fileUrl, extractionType } = req.body;
    // In production, implement actual file data extraction
    res.json({
      success: true,
      message: 'Data extraction placeholder',
      data: {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file
router.delete('/:filename', authMiddleware, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;