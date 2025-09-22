require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Mock data
const mockPhotos = [
  {
    _id: '1',
    url: 'https://images.pexels.com/photos/8499625/pexels-photo-8499625.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Divine Durga Puja celebration with beautiful decorations! 🙏✨',
    author: { _id: 'user1', name: 'Priya Sharma', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150' },
    location: 'Kolkata, West Bengal',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    score: 95,
    likes: 234,
    comments: [
      { _id: 'c1', text: 'Beautiful!', author: 'User1' },
      { _id: 'c2', text: 'Amazing decorations!', author: 'User2' }
    ],
    shares: 12,
    hashtags: ['#DurgaPuja', '#Festival', '#Culture']
  },
  {
    _id: '2',
    url: 'https://images.pexels.com/photos/6646917/pexels-photo-6646917.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Traditional pandal with intricate artwork and lighting',
    author: { _id: 'user2', name: 'Rajesh Kumar', avatar: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150' },
    location: 'Mumbai, Maharashtra',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    score: 88,
    likes: 189,
    comments: [
      { _id: 'c3', text: 'Stunning!', author: 'User3' }
    ],
    shares: 8,
    hashtags: ['#Pandal', '#Art', '#Traditional']
  },
  {
    _id: '3',
    url: 'https://images.pexels.com/photos/8499620/pexels-photo-8499620.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Beautiful idol with golden decorations and flowers',
    author: { _id: 'user3', name: 'Anita Das', avatar: 'https://images.pexels.com/photos/1674666/pexels-photo-1674666.jpg?auto=compress&cs=tinysrgb&w=150' },
    location: 'Delhi, India',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    score: 92,
    likes: 156,
    comments: [
      { _id: 'c4', text: 'Divine!', author: 'User4' },
      { _id: 'c5', text: 'So beautiful!', author: 'User5' }
    ],
    shares: 15,
    hashtags: ['#Idol', '#Golden', '#Devotion']
  }
];

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Pujomedia Backend is running' });
});

// GET /api/photos - Get paginated feed of photos
app.get('/api/photos', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const photos = mockPhotos
      .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)
      .slice(skip, skip + limit);

    const total = mockPhotos.length;

    res.json({
      photos: photos.map(photo => ({
        id: photo._id,
        url: photo.url,
        caption: photo.caption,
        author: photo.author,
        location: photo.location,
        timestamp: photo.createdAt,
        score: photo.score,
        likes: photo.likes,
        comments: photo.comments.length,
        shares: photo.shares,
        hashtags: photo.hashtags
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// POST /api/photos/upload - Upload a photo (mock)
app.post('/api/photos/upload', async (req, res) => {
  try {
    const { caption, location, imageUrl } = req.body;

    // Simulate AI scoring
    const score = Math.floor(Math.random() * 40) + 60; // Random score between 60-100

    const newPhoto = {
      _id: Date.now().toString(),
      url: imageUrl || 'https://images.pexels.com/photos/8499625/pexels-photo-8499625.jpeg?auto=compress&cs=tinysrgb&w=800',
      caption,
      location,
      author: { _id: 'user1', name: 'You', avatar: 'https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpg?auto=compress&cs=tinysrgb&w=150' },
      createdAt: new Date(),
      score,
      likes: 0,
      comments: [],
      shares: 0,
      hashtags: caption.match(/#[\w]+/g) || []
    };

    mockPhotos.unshift(newPhoto);

    res.status(201).json({
      message: 'Photo uploaded successfully',
      photo: {
        id: newPhoto._id,
        url: newPhoto.url,
        caption: newPhoto.caption,
        location: newPhoto.location,
        score: newPhoto.score,
        timestamp: newPhoto.createdAt
      }
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// POST /api/engagement/like/:photoId - Like a photo
app.post('/api/engagement/like/:photoId', async (req, res) => {
  try {
    const photo = mockPhotos.find(p => p._id === req.params.photoId);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    photo.likes += 1;
    res.json({ message: 'Photo liked successfully', likes: photo.likes });
  } catch (error) {
    console.error('Error liking photo:', error);
    res.status(500).json({ error: 'Failed to like photo' });
  }
});

// POST /api/engagement/comment/:photoId - Comment on a photo
app.post('/api/engagement/comment/:photoId', async (req, res) => {
  try {
    const { text } = req.body;
    const photo = mockPhotos.find(p => p._id === req.params.photoId);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const newComment = {
      _id: Date.now().toString(),
      text,
      author: 'You'
    };

    photo.comments.push(newComment);
    res.status(201).json({ message: 'Comment added successfully', comment: newComment });
  } catch (error) {
    console.error('Error commenting on photo:', error);
    res.status(500).json({ error: 'Failed to comment on photo' });
  }
});

// GET /api/leaderboard - Get top 10 photos
app.get('/api/leaderboard', async (req, res) => {
  try {
    const topPhotos = mockPhotos
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((photo, index) => ({
        id: photo._id,
        url: photo.url,
        caption: photo.caption,
        author: photo.author,
        score: photo.score,
        rank: index + 1,
        likes: photo.likes
      }));

    res.json({ leaderboard: topPhotos });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Mock auth endpoints
app.post('/api/auth/verify-token', async (req, res) => {
  // Mock token verification - always succeeds for demo
  res.json({
    uid: 'demo-user',
    email: 'demo@example.com',
    name: 'Demo User',
    picture: 'https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpg?auto=compress&cs=tinysrgb&w=150'
  });
});

app.get('/api/auth/profile', async (req, res) => {
  res.json({
    id: 'demo-user',
    name: 'Demo User',
    email: 'demo@example.com',
    avatar: 'https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpg?auto=compress&cs=tinysrgb&w=150',
    photosCount: 12,
    totalScore: 845,
    rank: 45
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Pujomedia Backend running on port ${PORT}`);
  console.log(`📊 Mock data loaded with ${mockPhotos.length} photos`);
  console.log(`🔗 Frontend should connect to: http://localhost:${PORT}`);
});

module.exports = app;
