const express = require('express');
const multer = require('multer');
const admin = require('firebase-admin');
const { db, getBucket } = require('../firebase');
const { authenticateToken } = require('../middleware/auth');
const aiService = require('../services/aiService');
const axios = require('axios');

const router = express.Router();

// GET /api/photos - Get all photos with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    console.log(`Fetching photos: page=${page}, limit=${limit}, offset=${offset}`);

    // Get photos from Firestore
    const photosRef = db.collection('photos');
    const snapshot = await photosRef
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    const photos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      photos.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      });
    });

    // Get total count for pagination
    const totalSnapshot = await photosRef.get();
    const total = totalSnapshot.size;
    const pages = Math.ceil(total / limit);

    console.log(`Found ${photos.length} photos out of ${total} total`);

    res.json({
      success: true,
      photos,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photos',
      error: error.message
    });
  }
});

// Helper function to extract hashtags from text
function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z0-9_]+/g) || [];
  // Remove the '#' from each tag and convert to lowercase
  return matches.map(tag => tag.substring(1).toLowerCase());
}

// AI Scoring URL
const AI_SCORING_URL = process.env.AI_SCORING_URL || 'http://localhost:8000/score';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// GET /api/photos/profile/:userId - Get photos by user ID
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!req.app.locals.userPhotos || !req.app.locals.userPhotos[userId]) {
      return res.json({ 
        photos: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        }
      });
    }
    
    const userPhotos = req.app.locals.userPhotos[userId] || [];
    
    res.json({
      photos: userPhotos,
      pagination: {
        page: 1,
        limit: userPhotos.length,
        total: userPhotos.length,
        pages: 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching user photos:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch user photos'
    });
  }
});

// GET /api/photos - Get paginated feed of photos
router.get('/', async (req, res) => {
  // Check if we have user photos in memory
  if (req.app.locals.userPhotos) {
    // Get all photos from all users
    const allPhotos = Object.values(req.app.locals.userPhotos).flat();
    if (allPhotos.length > 0) {
      return res.json({ 
        photos: allPhotos, 
        pagination: { 
          page: 1, 
          limit: allPhotos.length, 
          total: allPhotos.length, 
          pages: 1 
        } 
      });
    }
  }
  
  // Fallback to mock data if no user photos exist
  const mock = [
    {
      id: 'demo-1',
      url: 'https://images.pexels.com/photos/8499625/pexels-photo-8499625.jpeg?auto=compress&cs=tinysrgb&w=800',
      caption: 'Divine Durga Puja celebration with beautiful decorations! 🙏✨',
      author: { id: 'user1', name: 'Priya Sharma', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150' },
      location: 'Kolkata, West Bengal',
      createdAt: new Date(),
      score: 95,
      likes: [],
      comments: 2,
      shares: 12,
      hashtags: ['#DurgaPuja', '#Festival', '#Culture']
    },
    {
      id: 'demo-2',
      url: 'https://images.pexels.com/photos/6646917/pexels-photo-6646917.jpeg?auto=compress&cs=tinysrgb&w=800',
      caption: 'Traditional pandal with intricate artwork and lighting',
      author: { id: 'user2', name: 'Rajesh Kumar', avatar: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150' },
      location: 'Mumbai, Maharashtra',
      createdAt: new Date(),
      score: 88,
      likes: [],
      comments: 1,
      shares: 8,
      hashtags: ['#Pandal', '#Art', '#Traditional']
    }
  ];
  res.json({ photos: mock, pagination: { page: 1, limit: mock.length, total: mock.length, pages: 1 } });
});

// Add a health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    storage: {
      bucket: process.env.FIREBASE_STORAGE_BUCKET || 'not configured',
      emulator: process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'not configured'
    }
  });
});

// POST /api/photos/upload - Upload a photo (accepts 'photo' or 'file' field)
router.post('/upload', authenticateToken, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]), async (req, res) => {
  console.log('Upload request received', {
    files: req.files ? Object.keys(req.files) : 'no files',
    body: req.body,
    user: req.user
  });

  try {
    const fileObj = (req.files?.photo?.[0]) || (req.files?.file?.[0]);
    if (!fileObj) {
      console.error('No file in upload request');
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: "Please include a file with key 'photo' or 'file' in your form-data"
      });
    }

    const { caption = '', location = '' } = req.body;
    const userId = req.user?.uid || 'anonymous';
    
    console.log('Processing upload', {
      fileName: fileObj.originalname,
      fileSize: fileObj.size,
      fileType: fileObj.mimetype,
      caption,
      location,
      userId
    });

    // Handle file storage
    let photoUrl;
    const isDev = process.env.NODE_ENV === 'development' || process.env.DEV_FAKE_UPLOAD === 'true';
    const hasStorageConfig = process.env.FIREBASE_STORAGE_BUCKET;
    
    if (isDev || !hasStorageConfig) {
      console.log('Using development mode: Storing file locally');
      
      // Create uploads directory if it doesn't exist
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generate a unique filename
      const fileExt = path.extname(fileObj.originalname) || '.jpg';
      const filename = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${fileExt}`;
      const filePath = path.join(uploadsDir, filename);
      
      // Save file locally
      fs.writeFileSync(filePath, fileObj.buffer);
      
      // Create URL for the saved file
      const protocol = req.protocol || 'http';
      const host = req.headers.host || 'localhost:5000';
      photoUrl = `${protocol}://${host}/uploads/${filename}`;
      
      console.log('=== DEBUG INFO ===');
      console.log('File saved locally:', filePath);
      console.log('Request headers:', JSON.stringify(req.headers, null, 2));
      console.log('Request protocol:', req.protocol);
      console.log('Request host:', req.headers.host);
      console.log('Generated photo URL:', photoUrl);
      console.log('Full request URL:', req.originalUrl);
      console.log('Full request:', {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body
      });
      console.log('==================');
    } else {
      console.log('Attempting to upload to Firebase Storage...');
      try {
        const bucket = getBucket();
        const fileName = `photos/${userId}/${Date.now()}-${fileObj.originalname}`;
        const file = bucket.file(fileName);
        
        console.log('Uploading file to storage:', { bucket: bucket.name, fileName });
        
        await file.save(fileObj.buffer, {
          metadata: {
            contentType: fileObj.mimetype,
            cacheControl: 'public, max-age=31536000',
          },
          public: true,
          resumable: false
        });
        
        console.log('File uploaded, making public...');
        await file.makePublic();
        
        if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
          const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST.replace(/^https?:\/\//, '');
          photoUrl = `http://${host}/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
        } else {
          const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491' // Far future date
          });
          photoUrl = signedUrl;
        }
        
        console.log('File upload successful:', photoUrl);
      } catch (storageErr) {
        console.error('Storage upload error:', storageErr);
        return res.status(500).json({
          error: 'Failed to upload file to storage',
          message: storageErr.message || 'Storage upload failed',
          code: 'STORAGE_UPLOAD_ERROR'
        });
      }
    }

    // Call AI scoring service
    let score = 0;
    let scoreBreakdown = {};
    let feedback = [];
    
    try {
      console.log('Analyzing photo with AI service...');
      const aiAnalysis = await aiService.analyzePujaPhoto(fileObj.buffer);
      score = aiAnalysis.score || 0;
      scoreBreakdown = aiAnalysis.breakdown || {};
      feedback = aiAnalysis.feedback || [];
      console.log('AI analysis complete', { score, scoreBreakdown });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      // Use default values if AI service fails
      score = Math.floor(Math.random() * 40) + 60; // Random score between 60-100
      scoreBreakdown = {
        clarity: Math.floor(Math.random() * 20) + 80,
        composition: Math.floor(Math.random() * 20) + 70,
        colors: Math.floor(Math.random() * 20) + 75,
        culturalElements: Math.floor(Math.random() * 20) + 80,
        uniqueness: Math.floor(Math.random() * 20) + 65
      };
      feedback = ['AI analysis unavailable. Using default scoring.'];
    }

    // Create photo object
    const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const authorId = req.user?.uid || 'anonymous';
    const authorName = req.user?.name || req.user?.displayName || 'Anonymous';
    const authorAvatar = req.user?.picture || req.user?.photoURL || '';
    
    const photo = {
      id: photoId,
      url: photoUrl,
      caption,
      location,
      score,
      scoreBreakdown,
      feedback,
      authorId,
      isPrivate: false,
      author: {
        id: authorId,
        name: authorName,
        avatar: authorAvatar
      },
      likes: [],
      comments: [],
      shares: 0,
      hashtags: extractHashtags(caption),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In a real app, you would save this to a database
    // For now, we'll store it in memory for the current session
    if (!req.app.locals.userPhotos) {
      req.app.locals.userPhotos = {};
    }
    if (!req.app.locals.userPhotos[authorId]) {
      req.app.locals.userPhotos[authorId] = [];
    }
    req.app.locals.userPhotos[authorId].push(photo);

    // Save to Firestore
    try {
      console.log('Saving to Firestore...');
      const batch = db.batch();
      
      // Save photo
      const photoRef = db.collection('photos').doc(photoId);
      batch.set(photoRef, {
        ...photo,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Update or create user document
      const userRef = db.collection('users').doc(userId);
      batch.set(userRef, {
        displayName: authorName,
        name: authorName,
        photoURL: authorAvatar,
        avatar: authorAvatar,
        photosCount: admin.firestore.FieldValue.increment(1),
        totalScore: admin.firestore.FieldValue.increment(score || 0),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      await batch.commit();
      console.log('Successfully saved to Firestore with ID:', photoId);
    } catch (firestoreErr) {
      console.error('Failed to save to Firestore:', {
        message: firestoreErr.message,
        stack: firestoreErr.stack,
        code: firestoreErr.code,
        details: firestoreErr.details
      });
      // Continue with the response even if Firestore save fails
    }

    console.log('Upload process completed successfully');
    res.status(201).json({
      success: true,
      message: 'Photo uploaded successfully',
      photo: photo
    });
  } catch (error) {
    console.error('Error in upload handler:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      ...(error.response && {
        response: {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        }
      })
    });
    
    // Handle specific error cases
    if (error.name === 'MulterError') {
      return res.status(400).json({
        success: false,
        error: 'Upload Error',
        message: `File upload error: ${error.message}`,
        code: error.code || 'UPLOAD_ERROR',
        ...(process.env.NODE_ENV === 'development' && { details: error })
      });
    }

    // Handle Firebase errors
    if (error.code && error.code.startsWith('storage/')) {
      return res.status(500).json({
        success: false,
        error: 'Storage Error',
        message: 'Failed to upload file to storage',
        code: error.code,
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }

    // Default error handler
    const statusCode = error.statusCode || error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: error.name || 'Internal Server Error',
      message: error.message || 'Failed to upload photo',
      code: error.code || 'UPLOAD_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// POST /api/photos/:id/like - Like or unlike a photo
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id: photoId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized', 
        message: 'User not authenticated' 
      });
    }

    // In a real app, you would update the database here
    // For now, we'll return a success response with mock data
    
    // Mock response - in a real app, you would:
    // 1. Check if the user already liked the photo
    // 2. Add or remove the like accordingly
    // 3. Return the updated like count
    
    const isLiked = Math.random() > 0.5; // Mock: 50% chance of being liked
    const message = isLiked ? 'Photo liked successfully' : 'Like removed successfully';
    
    // Mock photo update
    const updatedPhoto = {
      id: photoId,
      likes: isLiked ? [userId] : [],
      likesCount: isLiked ? 1 : 0
    };

    res.status(200).json({
      success: true,
      message,
      data: updatedPhoto
    });
    
  } catch (error) {
    console.error('Error in like handler:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to process like',
      code: 'LIKE_ERROR'
    });
  }
});

// POST /api/photos/:id/like - Toggle like on a photo
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id: photoId } = req.params;
    const userId = req.user.uid;

    console.log(`User ${userId} toggling like on photo ${photoId}`);

    // Get the photo document
    const photoRef = db.collection('photos').doc(photoId);
    const photoDoc = await photoRef.get();

    if (!photoDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    const photoData = photoDoc.data();
    const currentLikes = photoData.likes || [];
    const isLiked = currentLikes.includes(userId);

    let updatedLikes;
    if (isLiked) {
      // Remove like
      updatedLikes = currentLikes.filter(id => id !== userId);
    } else {
      // Add like
      updatedLikes = [...currentLikes, userId];
    }

    // Update the photo document
    await photoRef.update({
      likes: updatedLikes,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Photo ${photoId} ${isLiked ? 'unliked' : 'liked'} by user ${userId}`);

    res.json({
      success: true,
      message: isLiked ? 'Photo unliked' : 'Photo liked',
      liked: !isLiked,
      likesCount: updatedLikes.length
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like',
      error: error.message
    });
  }
});

// POST /api/photos/:id/comments - Add a comment to a photo
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id: photoId } = req.params;
    const { text } = req.body;
    const userId = req.user.uid;
    const userName = req.user.name || req.user.displayName || 'Anonymous';
    const userAvatar = req.user.picture || req.user.photoURL || req.user.avatar || 'https://via.placeholder.com/40';

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    console.log(`User ${userId} adding comment to photo ${photoId}`);

    // Get the photo document
    const photoRef = db.collection('photos').doc(photoId);
    const photoDoc = await photoRef.get();

    if (!photoDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Create new comment
    const newComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      author: {
        id: userId,
        name: userName,
        avatar: userAvatar
      },
      createdAt: new Date().toISOString()
    };

    // Add comment to photo
    const photoData = photoDoc.data();
    const updatedComments = [...(photoData.comments || []), newComment];

    await photoRef.update({
      comments: updatedComments,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Comment added to photo ${photoId} by user ${userId}`);

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: newComment,
      commentsCount: updatedComments.length
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
});

module.exports = router;
