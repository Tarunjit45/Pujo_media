const express = require('express');
const { db } = require('../firebase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get current user's profile with their photos
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Get user's photos
    let photos = [];
    if (process.env.NODE_ENV === 'development') {
      // Mock data for development
      photos = Array(3).fill(0).map((_, i) => ({
        id: `mock-${i}`,
        url: `https://picsum.photos/seed/${userId}-${i}/800/600`,
        caption: `My Puja photo #${i + 1}`,
        score: 85 - (i * 5),
        createdAt: new Date(),
        likes: [],
        comments: []
      }));
    } else {
      // Get real photos from Firestore
      const photosSnapshot = await db.collection('photos')
        .where('authorId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      photos = photosSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        };
      });
    }
    
    // Prepare response
    const response = {
      user: {
        id: userId,
        name: userData.name || 'Anonymous',
        email: userData.email || '',
        avatar: userData.avatar || '',
        totalScore: userData.totalScore || 0,
        photosCount: photos.length,
        joinDate: userData.createdAt?.toDate?.() || new Date()
      },
      photos
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Get public profile by user ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Get user's public photos
    let photos = [];
    if (process.env.NODE_ENV === 'development') {
      // Mock data for development
      photos = Array(3).fill(0).map((_, i) => ({
        id: `mock-${i}`,
        url: `https://picsum.photos/seed/${userId}-${i}/800/600`,
        caption: `Puja photo #${i + 1}`,
        score: 85 - (i * 5),
        createdAt: new Date(),
        likes: [],
        comments: []
      }));
    } else {
      // Get real public photos from Firestore
      const photosSnapshot = await db.collection('photos')
        .where('authorId', '==', userId)
        .where('isPrivate', '==', false)
        .orderBy('createdAt', 'desc')
        .get();
      
      photos = photosSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date()
        };
      });
    }
    
    // Prepare public profile response
    const response = {
      user: {
        id: userId,
        name: userData.name || 'Anonymous',
        avatar: userData.avatar || '',
        totalScore: userData.totalScore || 0,
        photosCount: photos.length,
        joinDate: userData.createdAt?.toDate?.() || new Date()
      },
      photos
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

module.exports = router;
