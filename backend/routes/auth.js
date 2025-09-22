const express = require('express');
const { body, validationResult } = require('express-validator');
const admin = require('firebase-admin');
const router = express.Router();

// Signup route with email/password
router.post('/signup', [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password, name } = req.body;
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Create user document in Firestore
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      avatar: userRecord.photoURL || '',
      totalScore: 0,
      photosCount: 0,
      rank: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Generate custom token
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    res.json({
      token: customToken,
      user: {
        id: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
        avatar: userRecord.photoURL || ''
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Login route with email/password
router.post('/login', [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;
  try {
    // Firebase Auth doesn't have a direct login endpoint for server-side
    // Instead, we verify the credentials and return a custom token
    // The client should use Firebase SDK for login
    res.status(400).json({ error: 'Use Firebase SDK for login on client side' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Google OAuth routes - handled by Firebase SDK on client side
router.get('/google', (req, res) => {
  res.json({ message: 'Use Firebase SDK for Google OAuth on client side' });
});

router.get('/google/callback', (req, res) => {
  res.json({ message: 'Use Firebase SDK for Google OAuth on client side' });
});

// Verify Firebase token endpoint
router.post('/verify-token', async (req, res) => {
  const { token } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    res.json({
      user: {
        id: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || userData?.name,
        avatar: decodedToken.picture || userData?.avatar || ''
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
