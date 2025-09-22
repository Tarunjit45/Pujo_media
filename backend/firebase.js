const admin = require('firebase-admin');

// Validate required environment variables
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_STORAGE_BUCKET'
];

// Check for missing environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn('Warning: Missing required environment variables:', missingVars.join(', '));
  console.warn('Some features may not work as expected.');
}

// Initialize Firebase Admin SDK
let firebaseApp;
let firestore;
let auth;

try {
  if (!admin.apps.length) {
    console.log('Initializing Firebase Admin SDK...');
    
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY ? 
        process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

    console.log('Firebase Admin SDK initialized successfully');
    console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('Storage Bucket:', process.env.FIREBASE_STORAGE_BUCKET);
  } else {
    firebaseApp = admin.app();
  }

  // Initialize Firestore
  firestore = admin.firestore();
  
  // Configure Firestore settings
  const settings = { timestampsInSnapshots: true };
  firestore.settings(settings);
  
  // Initialize Auth
  auth = admin.auth();
  
  console.log('Firebase services initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  console.error('Error details:', {
    message: error.message,
    code: error.code,
    stack: error.stack
  });
  
  // Re-throw the error to prevent the app from starting with a broken Firebase connection
  throw new Error(`Failed to initialize Firebase: ${error.message}`);
}

/**
 * Get the Firebase Storage bucket
 * @returns {import('@google-cloud/storage').Bucket}
 */
function getBucket() {
  try {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('FIREBASE_STORAGE_BUCKET environment variable is not set');
    }
    
    const bucket = admin.storage().bucket(bucketName);
    
    // Test the bucket connection
    return bucket.getMetadata()
      .then(() => {
        console.log('Successfully connected to Firebase Storage bucket:', bucketName);
        return bucket;
      })
      .catch(error => {
        console.error('Failed to access Firebase Storage bucket:', bucketName, error);
        throw new Error(`Failed to access storage bucket: ${error.message}`);
      });
  } catch (error) {
    console.error('Error getting storage bucket:', error);
    throw new Error(`Storage bucket error: ${error.message}`);
  }
}

module.exports = { 
  db: firestore, 
  getBucket, 
  auth,
  admin // Export admin for testing or advanced use cases
};
