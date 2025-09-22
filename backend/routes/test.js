const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Test endpoint to check file uploads
router.get('/test-upload', (req, res) => {
  const uploadsPath = path.join(__dirname, '../../uploads');
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  
  // List all files in uploads directory
  fs.readdir(uploadsPath, (err, files) => {
    if (err) {
      return res.status(500).json({
        error: 'Failed to read uploads directory',
        message: err.message
      });
    }
    
    // Get file stats for each file
    const fileList = files.map(file => {
      const filePath = path.join(uploadsPath, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `/uploads/${file}`
      };
    });
    
    res.json({
      uploadsPath,
      files: fileList,
      message: 'Test endpoint working',
      instructions: 'Use /test/upload to test file uploads'
    });
  });
});

// Test file upload
const multer = require('multer');
const upload = multer({ dest: 'uploads/test/' });

router.post('/upload', upload.single('testFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    success: true,
    file: {
      originalname: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      url: `/uploads/test/${req.file.filename}`
    }
  });
});

module.exports = router;
