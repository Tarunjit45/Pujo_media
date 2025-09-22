# 🚀 Pujomedia Deployment Guide

## Overview
Pujomedia is a full-stack social ranking platform with three main components:
- **Frontend**: React + Vite + TailwindCSS + Framer Motion
- **Backend**: Node.js + Express + Firebase
- **AI Scoring Service**: Python + FastAPI + OpenCV

## Prerequisites
- Node.js 18+ installed
- Python 3.8+ installed
- Firebase project created
- Git installed

## 1. Frontend Deployment (Vercel)

### Option 1: Vercel (Recommended)
1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   cd project
   vercel
   ```

3. **Environment Variables**:
   Set these in Vercel dashboard:
   ```
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_BACKEND_URL=https://your-backend-url.com
   ```

### Option 2: Netlify
1. **Build the project**:
   ```bash
   cd project
   npm run build
   ```

2. **Deploy to Netlify**:
   - Drag and drop the `dist` folder to Netlify
   - Or use Netlify CLI: `netlify deploy --prod --dir=dist`

## 2. Backend Deployment (Render)

1. **Create Render Account**:
   - Go to [render.com](https://render.com)
   - Sign up and create a new Web Service

2. **Connect Repository**:
   - Connect your GitHub repository
   - Select the `backend` directory as root

3. **Configure Service**:
   - **Name**: pujomedia-backend
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Environment Variables**:
   Set these in Render dashboard:
   ```
   PORT=5000
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-url.vercel.app

   # Firebase Admin SDK
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY_ID=your_private_key_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your_client_id
   FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
   FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
   FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your_project.iam.gserviceaccount.com

   # AI Scoring Service
   AI_SCORING_URL=https://your-ai-service-url.com/score
   ```

## 3. AI Scoring Service Deployment

### Option 1: Render (Recommended)
1. **Create New Web Service**:
   - Name: pujomedia-ai-scoring
   - Runtime: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

2. **Environment Variables**:
   ```
   PORT=8000
   HOST=0.0.0.0
   ```

### Option 2: Railway
1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Deploy**:
   ```bash
   cd ai-scoring
   railway up
   ```

## 4. Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication and Firestore Database

### 2. Generate Service Account Key
1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract the values for your `.env` files

### 3. Configure Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Photos are publicly readable, but only authors can modify
    match /photos/{photoId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.author;
    }

    // Comments are publicly readable, but only authenticated users can create
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
    }
  }
}
```

### 4. Configure Storage Security Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 5. Domain Configuration

### Update Frontend Environment
```env
VITE_BACKEND_URL=https://your-backend-render-url.onrender.com
```

### Update Backend CORS
Update `backend/server.js`:
```javascript
const allowedOrigins = [
  'https://your-frontend-vercel-url.vercel.app',
  'https://your-custom-domain.com'
];
```

## 6. Testing the Deployment

1. **Frontend**: Visit your Vercel URL
2. **Backend**: Test health endpoint: `https://your-backend-url/api/health`
3. **AI Service**: Test scoring: `https://your-ai-url/score`

## 7. Monitoring and Logs

- **Vercel**: Check function logs in dashboard
- **Render**: View logs in service dashboard
- **Firebase**: Monitor usage in console

## 8. Troubleshooting

### Common Issues:
1. **CORS Errors**: Update allowed origins in backend
2. **Firebase Auth**: Check service account permissions
3. **AI Service Timeout**: Increase timeout in backend (default 5s)

### Performance Tips:
1. Enable Firebase CDN for images
2. Use Firebase App Check for additional security
3. Implement caching for leaderboard data
4. Use Firebase Cloud Functions for heavy processing

## 9. Cost Optimization

- **Firebase**: Use Blaze plan only when needed
- **Render**: Use free tier for development
- **Vercel**: Free tier includes 100GB bandwidth

---

## 📞 Support

For issues:
1. Check the logs in each platform's dashboard
2. Verify environment variables are set correctly
3. Test API endpoints individually
4. Check Firebase security rules and permissions
