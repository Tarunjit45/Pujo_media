const express = require('express');
const { body, validationResult } = require('express-validator');
const admin = require('firebase-admin');
const { db } = require('../firebase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Like a photo
router.post('/like/:photoId', authenticateToken, async (req, res) => {
  const { photoId } = req.params;
  try {
    const photoRef = db.collection('photos').doc(photoId);
    const photoDoc = await photoRef.get();

    if (!photoDoc.exists) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photoData = photoDoc.data();
    const likes = photoData.likes || [];

    if (likes.includes(req.user.uid)) {
      // Unlike the photo
      const updatedLikes = likes.filter(id => id !== req.user.uid);
      await photoRef.update({
        likes: updatedLikes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return res.json({ success: true, likesCount: updatedLikes.length, liked: false });
    } else {
      // Like the photo
      likes.push(req.user.uid);
      await photoRef.update({
        likes: likes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return res.json({ success: true, likesCount: likes.length, liked: true });
    }
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ error: 'Failed to like photo' });
  }
});

// Comment on a photo
router.post('/comment/:photoId', authenticateToken, [
  body('text').isLength({ min: 1, max: 500 }).withMessage('Comment text must be between 1 and 500 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { photoId } = req.params;
  const { text } = req.body;
  try {
    const photoRef = db.collection('photos').doc(photoId);
    const photoDoc = await photoRef.get();

    if (!photoDoc.exists) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Create comment document
    const commentRef = db.collection('comments').doc();
    const commentData = {
      id: commentRef.id,
      text,
      author: req.user.uid,
      photo: photoId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await commentRef.set(commentData);

    // Update photo's comment count
    const photoData = photoDoc.data();
    const comments = photoData.comments || [];
    comments.push(commentRef.id);

    await photoRef.update({
      comments: comments,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, comment: commentData });
  } catch (err) {
    console.error('Comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Share a photo (increment share count)
router.post('/share/:photoId', authenticateToken, async (req, res) => {
  const { photoId } = req.params;
  try {
    const photoRef = db.collection('photos').doc(photoId);
    const photoDoc = await photoRef.get();

    if (!photoDoc.exists) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photoData = photoDoc.data();
    const shares = (photoData.shares || 0) + 1;

    await photoRef.update({
      shares: shares,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, sharesCount: shares });
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).json({ error: 'Failed to share photo' });
  }
});

module.exports = router;
