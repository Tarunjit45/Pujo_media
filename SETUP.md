# 🚀 Pujomedia Setup Guide

## Overview
Pujomedia is a full-stack social ranking platform for Puja photos with React frontend, Node.js backend, and Python AI scoring service.

## Prerequisites
- Node.js 18+ and npm
- Python 3.8+ and pip
- MongoDB (local or Atlas)
- Firebase project (already configured)

## Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd project/backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start MongoDB (if using local)
# mongod

# Start the backend server
npm run dev
```

### 2. Frontend Setup

```bash
# Navigate to project root
cd project

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 3. AI Scoring Service Setup

```bash
# Navigate to AI scoring directory
cd project/ai-scoring

# Install Python dependencies
pip install -r requirements.txt

# Start the AI scoring service
python main.py
```

## Environment Configuration

### Backend (.env)
Your backend `.env` file has been pre-configured with your Firebase credentials:

```env
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Firebase_Private_Key_Here\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your_project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/pujomedia

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT Secret (Generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# AI Scoring Service
AI_SCORING_URL=http://localhost:8000/score
```

### Frontend (.env.local)
Your frontend `.env.local` file has been pre-configured:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Backend URL
VITE_BACKEND_URL=http://localhost:5000
```

## Services Overview

### Backend (Port 5000)
- **Authentication**: JWT-based login/signup + Google OAuth
- **Photo Management**: Upload, feed, engagement (like, comment, share)
- **Leaderboard**: Top 10 scored photos
- **Security**: Rate limiting, input validation, CORS, helmet

### Frontend (Port 5173)
- **React + TypeScript**: Modern frontend with Tailwind CSS
- **Firebase Integration**: Authentication and storage
- **Features**: Photo upload, feed, leaderboard, user profiles
- **Responsive**: Mobile-first design

### AI Scoring Service (Port 8000)
- **FastAPI**: Python microservice for photo scoring
- **OpenCV + MobileNet**: Image analysis for scoring
- **Scoring Criteria**: Clarity, lighting, vibrancy, creativity

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/profile` - Get user profile

### Photos
- `POST /api/photos/upload` - Upload photo
- `GET /api/photos/feed` - Get photo feed
- `GET /api/photos/:id` - Get single photo

### Engagement
- `POST /api/engagement/like/:photoId` - Like photo
- `POST /api/engagement/comment/:photoId` - Comment on photo
- `POST /api/engagement/share/:photoId` - Share photo

### Leaderboard
- `GET /api/leaderboard` - Get top 10 photos

## Testing

### Backend Tests
```bash
cd project/backend
npm test
```

### API Testing
Use the provided Postman collection: `Pujomedia_API_Collection.postman_collection.json`

## Deployment

### Docker Deployment
```bash
# Build and run all services
docker-compose up --build
```

### Individual Service Deployment
- **Frontend**: Deploy to Vercel/Netlify
- **Backend**: Deploy to Heroku/Railway
- **AI Service**: Deploy to AWS Lambda/Google Cloud Run

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running locally
   - Or update `MONGODB_URI` for cloud database

2. **Firebase Authentication Error**
   - Check Firebase project settings
   - Ensure domain is authorized for OAuth

3. **AI Scoring Service Error**
   - Install Python dependencies
   - Check OpenCV installation

4. **CORS Error**
   - Update `FRONTEND_URL` in backend .env
   - Ensure frontend URL matches your development server

### Logs
- Backend: Check console output on port 5000
- Frontend: Check browser console and terminal
- AI Service: Check console output on port 8000

## Security Notes

1. **Change JWT Secret**: Update `JWT_SECRET` in production
2. **Firebase Security Rules**: Configure Firestore and Storage rules
3. **Environment Variables**: Never commit `.env` files to version control
4. **HTTPS**: Use HTTPS in production

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all services are running on correct ports
4. Check network connectivity between services

## Next Steps

1. ✅ Setup complete with your Firebase configuration
2. 🔄 Start all services (backend, frontend, AI scoring)
3. 🧪 Test photo upload and scoring functionality
4. 🚀 Deploy to production when ready

Your Pujomedia platform is now ready to use! 🎉
