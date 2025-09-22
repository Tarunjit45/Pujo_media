# 🌸 Pujo_media - Social Ranking Platform for Puja Photos

A full-stack responsive social platform where users can upload their Puja photos, get AI-scored, ranked, and featured. Other users can like, comment, and share photos with a comprehensive leaderboard system. Fully responsive design optimized for mobile, tablet, and desktop devices.

![Pujomedia](https://img.shields.io/badge/Pujomedia-Social%20Ranking%20Platform-blue) ![React](https://img.shields.io/badge/React-18.3.1-blue) ![Node.js](https://img.shields.io/badge/Node.js-18+-green) ![Firebase](https://img.shields.io/badge/Firebase-12.2.1-orange) ![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-red)

## ✨ Features

### 🎨 Frontend (React + Vite)
- **Firebase Authentication** - Email/password + Google OAuth
- **Photo Upload** - Drag & drop with preview and caption
- **AI Scoring Integration** - Real-time scoring with breakdown
- **Social Feed** - Paginated feed sorted by score and recency
- **Engagement** - Like, comment, and share functionality
- **Leaderboard** - Top 10 photos and users
- **Fully Responsive Design** - Mobile-first with Tailwind CSS, optimized for all devices
- **Profile Management** - User profiles with photo galleries and stats
- **Custom Logo Integration** - Branded experience with custom Pujo_media logo
- **Fallback Avatar System** - Canvas-generated avatars when profile images fail
- **Database Cleanup Tools** - Scripts to clear test data before deployment
- **Smooth Animations** - Framer Motion integration
- **Real-time Updates** - Firebase real-time listeners

### 🔧 Backend (Node.js + Express)
- **Firebase Admin SDK** - Server-side Firebase integration
- **JWT Authentication** - Secure token-based auth
- **Image Upload** - Firebase Storage integration
- **RESTful APIs** - Well-structured API endpoints
- **Rate Limiting** - Protection against abuse
- **Input Validation** - Comprehensive data validation
- **Error Handling** - Proper error responses

### 🤖 AI Scoring Service (Python + FastAPI)
- **Computer Vision** - OpenCV-based image analysis
- **Multi-criteria Scoring** - Clarity, lighting, vibrancy, creativity
- **RESTful API** - Fast and lightweight scoring service
- **Error Handling** - Robust error management
- **CORS Support** - Cross-origin requests

## 🏗️ Tech Stack

### Frontend
- **React 18.3.1** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Animation library
- **Firebase SDK** - Authentication and database
- **Lucide React** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Firebase Admin SDK** - Server-side Firebase
- **Express Validator** - Input validation
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Express Rate Limit** - Rate limiting

### AI Service
- **Python 3.8+** - Programming language
- **FastAPI** - Web framework
- **OpenCV** - Computer vision
- **NumPy** - Numerical computing
- **Uvicorn** - ASGI server
- **Requests** - HTTP library

### Database & Storage
- **Firebase Firestore** - NoSQL database
- **Firebase Storage** - File storage
- **Firebase Authentication** - User management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Python 3.8+ installed
- Firebase project created
- Git installed

### 1. Clone the Repository
```bash
git clone https://github.com/Tarunjit45/Pujo_media.git
cd Pujo_media
```

### 2. Frontend Setup
```bash
cd project
npm install
cp .env.example .env.local
# Edit .env.local with your Firebase config
npm run dev
```

### 3. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Firebase Admin SDK config
npm run dev
```

### 4. AI Scoring Service Setup
```bash
cd ai-scoring
pip install -r requirements.txt
cp .env.example .env
# Edit .env if needed
python main.py
```

### 5. Environment Variables

#### Frontend (.env.local)
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_BACKEND_URL=http://localhost:5000
```

#### Backend (.env)
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

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
AI_SCORING_URL=http://localhost:8000/score
```

## 📁 Project Structure

```
pujomedia/
├── project/                    # Frontend (React)
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/             # Page components
│   │   ├── firebase.ts        # Firebase config
│   │   └── App.tsx            # Main app component
│   ├── .env.example           # Frontend env template
│   └── package.json
├── backend/                   # Backend (Node.js)
│   ├── routes/                # API routes
│   │   ├── auth.js           # Authentication routes
│   │   ├── photos.js         # Photo management
│   │   ├── engagement.js     # Like/comment/share
│   │   └── leaderboard.js    # Leaderboard routes
│   ├── middleware/            # Express middleware
│   ├── models/               # Data models
│   ├── config/               # Configuration
│   ├── tests/                # Jest tests
│   ├── firebase.js           # Firebase admin config
│   ├── server.js             # Express server
│   └── .env.example          # Backend env template
├── ai-scoring/               # AI Service (Python)
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # AI service env template
├── DEPLOYMENT.md            # Deployment guide
├── Pujomedia_API_Collection.postman_collection.json
└── README.md
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/verify-token` - Verify Firebase token

### Photos
- `GET /api/photos` - Get paginated photo feed
- `POST /api/photos/upload` - Upload new photo

### Engagement
- `POST /api/engagement/like/:photoId` - Like/unlike photo
- `POST /api/engagement/comment/:photoId` - Comment on photo
- `POST /api/engagement/share/:photoId` - Share photo

### Leaderboard
- `GET /api/leaderboard/photos` - Get top 10 photos
- `GET /api/leaderboard/users` - Get top 10 users

### Health Check
- `GET /api/health` - Service health check

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### API Testing
Import `Pujomedia_API_Collection.postman_collection.json` into Postman and test all endpoints.

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd project
vercel --prod
```

### Backend (Render)
1. Connect GitHub repository to Render
2. Set root directory to `backend`
3. Add environment variables
4. Deploy

### AI Service (Render)
1. Connect GitHub repository to Render
2. Set root directory to `ai-scoring`
3. Add environment variables
4. Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 🔐 Security Features

- **Firebase Authentication** - Secure user authentication
- **Input Validation** - Express-validator for all inputs
- **Rate Limiting** - Protection against abuse
- **CORS** - Configured for allowed origins
- **Helmet** - Security headers
- **Firebase Security Rules** - Database and storage protection

## 📊 AI Scoring Algorithm

The AI scoring service analyzes photos based on:

1. **Clarity** (25%) - Laplacian variance for sharpness
2. **Lighting** (25%) - Brightness histogram analysis
3. **Vibrancy** (25%) - Color saturation variance
4. **Creativity** (25%) - Heuristic-based scoring

Score range: 0-100 (higher is better)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Firebase** - Backend services
- **React** - Frontend framework
- **FastAPI** - AI service framework
- **OpenCV** - Computer vision
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the deployment guide
- Review the API documentation

---

**Made with ❤️ for the Puja community**
