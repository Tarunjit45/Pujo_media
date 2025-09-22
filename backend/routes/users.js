const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const db = admin.firestore();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = req.user.uid;
    const { displayName, bio } = req.body;

    console.log(`Updating profile for user ${userId}`);
    console.log('Request body:', { displayName, bio });
    console.log('Uploaded file:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file uploaded');

    // Get current user data
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    let userData = {};
    if (userDoc.exists) {
      userData = userDoc.data();
    }

    // Prepare update data
    const updateData = {
      ...userData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (displayName && displayName.trim()) {
      updateData.displayName = displayName.trim();
      updateData.name = displayName.trim(); // Also update name field for consistency
    }

    if (bio !== undefined) {
      updateData.bio = bio.trim();
    }

    // Handle profile picture upload
    if (req.file) {
      const profilePictureUrl = `http://localhost:5000/uploads/profiles/${req.file.filename}`;
      updateData.photoURL = profilePictureUrl;
      updateData.avatar = profilePictureUrl;
      console.log('Profile picture URL constructed:', profilePictureUrl);
      console.log('File saved to:', req.file.path);
    }

    // Update user document
    await userRef.set(updateData, { merge: true });

    // Also update Firebase Auth profile if displayName changed
    if (displayName && displayName.trim()) {
      try {
        await admin.auth().updateUser(userId, {
          displayName: displayName.trim(),
          ...(req.file && { photoURL: updateData.photoURL })
        });
      } catch (authError) {
        console.warn('Failed to update Firebase Auth profile:', authError.message);
        // Continue anyway, as Firestore update succeeded
      }
    }

    console.log(`Profile updated successfully for user ${userId}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        uid: userId,
        displayName: updateData.displayName || updateData.name,
        name: updateData.name,
        photoURL: updateData.photoURL,
        avatar: updateData.avatar,
        bio: updateData.bio,
        totalScore: updateData.totalScore || 0,
        photos: updateData.photos || 0,
        rank: updateData.rank || 999
      }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// GET /api/users/profile/:userId - Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = userDoc.data();

    res.json({
      success: true,
      user: {
        uid: userId,
        displayName: userData.displayName || userData.name,
        name: userData.name,
        photoURL: userData.photoURL,
        avatar: userData.avatar,
        bio: userData.bio || '',
        totalScore: userData.totalScore || 0,
        photos: userData.photos || 0,
        rank: userData.rank || 999,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
});

module.exports = router;
