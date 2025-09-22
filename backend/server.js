require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const photoRoutes = require('./routes/photos');
const engagementRoutes = require('./routes/engagement');
const leaderboardRoutes = require('./routes/leaderboard');
const profileRoutes = require('./routes/profile');
const userRoutes = require('./routes/users');
const testRoutes = require('./routes/test');
const testFirestoreRoutes = require('./routes/test-firestore');
const testDbRoutes = require('./routes/test-db');

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

const app = express();

// Security middleware
// Allow popups (Firebase signInWithPopup) to call window.close without COOP warnings
// Relax connect-src to permit local tooling and DevTools discovery fetches
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
  crossOriginEmbedderPolicy: { policy: 'unsafe-none' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", "data:", "blob:", "http://localhost:5000", "https:"],
      "connect-src": [
        "'self'",
        "http:",
        "https:",
        "ws:",
        "wss:",
        "http://localhost:5000",
        "http://127.0.0.1:5000"
      ]
    }
  }
}));

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];

// Enable CORS for all routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Always allow requests from any origin in development
  if (process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    return next();
  }
  
  // In production, only allow requests from allowed origins
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }
  
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', userRoutes);
app.use('/test', testRoutes); // Test routes
app.use('/api/test', testFirestoreRoutes); // Firestore test routes
app.use('/api/test-db', testDbRoutes); // Database test routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Pujomedia Backend is running' });
});

// Storage diagnostics (no secrets)
app.get('/api/storage/health', (req, res) => {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || null;
  const emulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST || null;
  res.json({
    bucket,
    emulator,
    hints: [
      'Bucket must end with .appspot.com, e.g., <project-id>.appspot.com',
      'When emulator is set (host:port), uploads route will construct emulator URLs',
    ]
  });
});

// Chrome DevTools discovery file (prevents 404s seen in console)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.json({
    name: 'Pujomedia Backend',
    description: 'DevTools discovery placeholder',
    version: '1.0.0'
  });
});

// Serve uploaded files in development
if (process.env.NODE_ENV === 'development') {
  const uploadsPath = path.join(__dirname, '../uploads');
  const profilesPath = path.join(uploadsPath, 'profiles');
  
  // Create uploads directory if it doesn't exist
  const fs = require('fs');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  
  // Create profiles subdirectory if it doesn't exist
  if (!fs.existsSync(profilesPath)) {
    fs.mkdirSync(profilesPath, { recursive: true });
  }
  
  // Static file serving with proper CORS and security headers
  app.use('/uploads', (req, res, next) => {
    // Set CORS headers for all origins in development
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'false');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Continue to static file serving
    next();
  }, express.static(uploadsPath, {
    etag: true,
    lastModified: true,
    maxAge: '1d',
    setHeaders: (res, path) => {
      // Set proper content type for images
      if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (path.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (path.endsWith('.gif')) {
        res.setHeader('Content-Type', 'image/gif');
      } else if (path.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp');
      }
      
      // Permissive CORS headers for images
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
      res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    }
  }));
  
  console.log('Serving static files from:', uploadsPath);
  console.log('Profile pictures path:', profilesPath);
  console.log('Example profile URL: http://localhost:5000/uploads/profiles/profile-example.jpg');
  
  // Debug endpoint to list all uploaded files
  app.get('/api/uploads', (req, res) => {
    fs.readdir(uploadsPath, (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to read uploads directory' });
      }
      res.json({
        uploadsPath,
        files: files.map(file => ({
          name: file,
          path: `/uploads/${file}`,
          url: `http://localhost:5000/uploads/${file}`,
          stats: fs.statSync(path.join(uploadsPath, file))
        }))
      });
    });
  });

  // Debug endpoint to list profile pictures
  app.get('/api/uploads/profiles', (req, res) => {
    fs.readdir(profilesPath, (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to read profiles directory', path: profilesPath });
      }
      res.json({
        profilesPath,
        files: files.map(file => ({
          name: file,
          path: `/uploads/profiles/${file}`,
          url: `http://localhost:5000/uploads/profiles/${file}`,
          stats: fs.statSync(path.join(profilesPath, file))
        }))
      });
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error handler:', {
    error: err.message || err,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Handle CORS errors
  if (err.name === 'CorsError') {
    return res.status(403).json({
      success: false,
      error: 'CORS Error',
      message: err.message || 'Not allowed by CORS',
      code: 'CORS_ERROR'
    });
  }

  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    let statusCode = 400;
    let message = `Upload error: ${err.message}`;
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      message = 'File too large. Maximum size is 10MB.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected field: ${err.field}. Please use 'photo' as the field name.`;
    }
    
    return res.status(statusCode).json({
      success: false,
      error: 'Upload Error',
      message,
      code: err.code || 'UPLOAD_ERROR'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Invalid or expired token',
      code: 'AUTH_ERROR'
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
      code: 'VALIDATION_ERROR',
      ...(process.env.NODE_ENV === 'development' && { details: err.errors })
    });
  }

  // Default error handler
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

// Start server only if this file is run directly (not in tests)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log('Server is ready to accept connections...');
  });
  
  // Keep the server alive
  server.on('error', (err) => {
    console.error('Server error:', err);
  });
  
  // Prevent the process from exiting
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

module.exports = app;

// Global crash handlers to avoid silent exits during development
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
