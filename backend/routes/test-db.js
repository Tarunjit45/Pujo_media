const express = require('express');
const router = express.Router();
const { db } = require('../firebase');

// Test database connection
router.get('/test-db', async (req, res) => {
  try {
    // Try to get a document that should exist
    const testDoc = await db.collection('test').doc('connection-test').get();
    
    if (!testDoc.exists) {
      // If the test document doesn't exist, create one
      await db.collection('test').doc('connection-test').set({
        message: 'Test document',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get the server timestamp to verify Firestore is working
    const serverTime = await db.collection('test').doc('server-time').set({
      timestamp: new Date().toISOString()
    }, { merge: true });
    
    res.status(200).json({
      success: true,
      message: 'Successfully connected to Firestore',
      testDoc: testDoc.exists ? testDoc.data() : 'Created new test document',
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to Firestore',
      error: error.message
    });
  }
});

module.exports = router;
