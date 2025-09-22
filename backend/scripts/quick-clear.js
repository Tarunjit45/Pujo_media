#!/usr/bin/env node

/**
 * Quick Database Clear Script for Pujo_media
 * 
 * This script will immediately clear all test data without confirmation.
 * Use this when you're sure you want to delete everything.
 * 
 * Usage: node scripts/quick-clear.js
 */

require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function quickClear() {
  console.log(`🚀 Quick clearing all data...`);
  
  let totalDeleted = 0;

  // Clear Firestore collections
  const collections = ['photos', 'users', 'comments', 'likes', 'shares'];
  
  for (const collection of collections) {
    try {
      const collectionRef = db.collection(collection);
      const snapshot = await collectionRef.get();
      
      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✅ Cleared ${snapshot.docs.length} items from ${collection}`);
        totalDeleted += snapshot.docs.length;
      }
    } catch (error) {
      console.log(`⚠️  Could not clear ${collection}: ${error.message}`);
    }
  }

  // Clear Firebase Storage
  try {
    const [files] = await bucket.getFiles();
    for (const file of files) {
      await file.delete();
      totalDeleted++;
    }
    console.log(`✅ Cleared ${files.length} files from Firebase Storage`);
  } catch (error) {
    console.log(`⚠️  Could not clear Firebase Storage: ${error.message}`);
  }

  // Clear local uploads
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const profilesDir = path.join(uploadsDir, 'profiles');
    
    if (fs.existsSync(profilesDir)) {
      const files = fs.readdirSync(profilesDir);
      for (const file of files) {
        const filePath = path.join(profilesDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          totalDeleted++;
        }
      }
      console.log(`✅ Cleared ${files.length} local upload files`);
    }
  } catch (error) {
    console.log(`⚠️  Could not clear local uploads: ${error.message}`);
  }

  console.log(`🎉 Done! Deleted ${totalDeleted} total items.`);
  console.log(`🚀 Your database is now clean for deployment!`);
}

quickClear().catch(console.error);
