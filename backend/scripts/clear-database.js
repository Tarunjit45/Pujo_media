#!/usr/bin/env node

/**
 * Database Cleanup Script for Pujo_media
 * 
 * This script will clear all test data from your Firestore database
 * and remove uploaded files before deployment.
 * 
 * Usage: node scripts/clear-database.js
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

/**
 * Delete all documents from a Firestore collection
 */
async function clearCollection(collectionName) {
  console.log(`🗑️  Clearing collection: ${collectionName}`);
  
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log(`   ✅ Collection ${collectionName} is already empty`);
    return 0;
  }

  const batch = db.batch();
  let count = 0;
  
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });

  await batch.commit();
  console.log(`   ✅ Deleted ${count} documents from ${collectionName}`);
  return count;
}

/**
 * Delete all files from Firebase Storage
 */
async function clearStorage() {
  console.log(`🗑️  Clearing Firebase Storage`);
  
  try {
    const [files] = await bucket.getFiles();
    
    if (files.length === 0) {
      console.log(`   ✅ Firebase Storage is already empty`);
      return 0;
    }

    let count = 0;
    for (const file of files) {
      await file.delete();
      count++;
      console.log(`   🗑️  Deleted: ${file.name}`);
    }
    
    console.log(`   ✅ Deleted ${count} files from Firebase Storage`);
    return count;
  } catch (error) {
    console.error(`   ❌ Error clearing Firebase Storage:`, error.message);
    return 0;
  }
}

/**
 * Delete local uploaded files
 */
async function clearLocalUploads() {
  console.log(`🗑️  Clearing local uploads directory`);
  
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log(`   ✅ Uploads directory doesn't exist`);
    return 0;
  }

  let totalDeleted = 0;
  
  // Clear profiles directory
  const profilesDir = path.join(uploadsDir, 'profiles');
  if (fs.existsSync(profilesDir)) {
    const files = fs.readdirSync(profilesDir);
    for (const file of files) {
      const filePath = path.join(profilesDir, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        totalDeleted++;
        console.log(`   🗑️  Deleted: profiles/${file}`);
      }
    }
  }
  
  // Clear any other upload subdirectories
  const subdirs = fs.readdirSync(uploadsDir);
  for (const subdir of subdirs) {
    const subdirPath = path.join(uploadsDir, subdir);
    if (fs.statSync(subdirPath).isDirectory() && subdir !== 'profiles') {
      const files = fs.readdirSync(subdirPath);
      for (const file of files) {
        const filePath = path.join(subdirPath, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          totalDeleted++;
          console.log(`   🗑️  Deleted: ${subdir}/${file}`);
        }
      }
    }
  }
  
  console.log(`   ✅ Deleted ${totalDeleted} local files`);
  return totalDeleted;
}

/**
 * Main cleanup function
 */
async function clearAllData() {
  console.log(`🚀 Starting Pujo_media Database Cleanup`);
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`=====================================\n`);

  let totalDeleted = 0;

  try {
    // Clear Firestore collections
    const collections = ['photos', 'users', 'comments', 'likes', 'shares'];
    
    for (const collection of collections) {
      const deleted = await clearCollection(collection);
      totalDeleted += deleted;
    }

    console.log('');

    // Clear Firebase Storage
    const storageDeleted = await clearStorage();
    totalDeleted += storageDeleted;

    console.log('');

    // Clear local uploads
    const localDeleted = await clearLocalUploads();
    totalDeleted += localDeleted;

    console.log('');
    console.log(`=====================================`);
    console.log(`✅ CLEANUP COMPLETED SUCCESSFULLY!`);
    console.log(`📊 Total items deleted: ${totalDeleted}`);
    console.log(`🚀 Your database is now clean and ready for deployment!`);
    console.log(`=====================================`);

  } catch (error) {
    console.error(`❌ CLEANUP FAILED:`, error);
    process.exit(1);
  }
}

/**
 * Confirmation prompt
 */
function askForConfirmation() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log(`⚠️  WARNING: This will permanently delete ALL data from your database!`);
    console.log(`📋 This includes:`);
    console.log(`   • All photos and their metadata`);
    console.log(`   • All user profiles`);
    console.log(`   • All comments and likes`);
    console.log(`   • All uploaded files`);
    console.log(`   • All Firebase Storage files`);
    console.log('');
    
    rl.question('Are you sure you want to proceed? Type "YES" to confirm: ', (answer) => {
      rl.close();
      resolve(answer === 'YES');
    });
  });
}

// Run the script
async function main() {
  const confirmed = await askForConfirmation();
  
  if (!confirmed) {
    console.log(`❌ Operation cancelled. No data was deleted.`);
    process.exit(0);
  }

  await clearAllData();
  process.exit(0);
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { clearAllData, clearCollection, clearStorage, clearLocalUploads };
