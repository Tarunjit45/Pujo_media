const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Test Firestore connection
router.get('/test-firestore', async (req, res) => {
  try {
    const db = admin.firestore();
    
    // Test write
    const testRef = db.collection('testConnection').doc('testDoc');
    await testRef.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: 'Firestore connection test successful'
    });
    
    // Test read
    const doc = await testRef.get();
    
    res.status(200).json({
      success: true,
      message: 'Firestore connection successful',
      data: doc.data()
    });
  } catch (error) {
    console.error('Firestore test error:', error);
    res.status(500).json({
      success: false,
      message: 'Firestore connection failed',
      error: error.message
    });
  }
});

module.exports = router;
