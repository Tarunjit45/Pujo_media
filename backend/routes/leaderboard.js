const express = require('express');
const admin = require('firebase-admin');
const { db } = require('../firebase');
const router = express.Router();

// Get top 10 scored photos with pagination
router.get('/photos', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    console.log(`Fetching top photos: limit=${limit}, page=${page}, offset=${offset}`);

    // Fetch real photos from Firestore
    const photosSnapshot = await db.collection('photos')
      .orderBy('score', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    const totalDocs = (await db.collection('photos').count().get()).data().count;
    const photos = [];
    
    console.log(`Found ${photosSnapshot.docs.length} photos in leaderboard`);
    
    for (const doc of photosSnapshot.docs) {
      const photoData = doc.data();
      
      // Get author data from the photo's author object or fetch from users collection
      let authorInfo = photoData.author || {};
      
      // If author info is incomplete, try to fetch from users collection
      if (!authorInfo.name || !authorInfo.avatar) {
        try {
          const authorId = photoData.authorId || photoData.author?.id;
          if (authorId) {
            const authorDoc = await db.collection('users').doc(authorId).get();
            const authorData = authorDoc.data() || {};
            authorInfo = {
              id: authorId,
              name: authorData.displayName || authorData.name || authorInfo.name || 'Anonymous',
              avatar: authorData.avatar || authorData.photoURL || authorInfo.avatar || ''
            };
          }
        } catch (err) {
          console.warn(`Could not fetch author data for photo ${doc.id}:`, err);
        }
      }

      photos.push({
        id: doc.id,
        url: photoData.url,
        caption: photoData.caption,
        author: authorInfo,
        location: photoData.location,
        score: photoData.score || 0,
        scoreBreakdown: photoData.scoreBreakdown || {},
        feedback: photoData.feedback || [],
        likes: photoData.likes || [],
        comments: photoData.comments || [],
        shares: photoData.shares || 0,
        hashtags: photoData.hashtags || [],
        createdAt: photoData.createdAt?.toDate?.() || new Date(),
        updatedAt: photoData.updatedAt?.toDate?.() || new Date()
      });
    }

    res.json({ 
      photos,
      pagination: {
        page,
        limit,
        total: totalDocs,
        pages: Math.ceil(totalDocs / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching leaderboard photos:', err);
    res.status(500).json({ 
      error: 'Failed to fetch leaderboard',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
});

// Get top users by total score with pagination
router.get('/users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    console.log(`Fetching top users: limit=${limit}, page=${page}, offset=${offset}`);

    // Fetch all users and filter/sort in memory to avoid Firestore composite index requirement
    const usersSnapshot = await db.collection('users').get();
    
    const allUsers = [];
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      // Only include users who have uploaded photos and have valid data
      if (userData.photosCount > 0 && userData.name && userData.totalScore > 0) {
        allUsers.push({
          id: doc.id,
          name: userData.displayName || userData.name || 'Anonymous',
          avatar: userData.avatar || userData.photoURL || '',
          totalScore: userData.totalScore || 0,
          photos: userData.photosCount || 0,
          level: Math.floor((userData.totalScore || 0) / 100) + 1,
          badges: userData.badges || []
        });
      }
    }
    
    // Sort by total score in descending order
    allUsers.sort((a, b) => b.totalScore - a.totalScore);
    
    // Add ranks
    allUsers.forEach((user, index) => {
      user.rank = index + 1;
    });
    
    // Apply pagination
    const totalDocs = allUsers.length;
    const users = allUsers.slice(offset, offset + limit);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: totalDocs,
        pages: Math.ceil(totalDocs / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching leaderboard users:', err);
    res.status(500).json({
      error: 'Failed to fetch user leaderboard',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
});

module.exports = router;
