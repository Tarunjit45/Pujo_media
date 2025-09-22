const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: String,
    default: ''
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  scoreBreakdown: {
    clarity: { type: Number, min: 0, max: 100 },
    lighting: { type: Number, min: 0, max: 100 },
    vibrancy: { type: Number, min: 0, max: 100 },
    creativity: { type: Number, min: 0, max: 100 }
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  shares: {
    type: Number,
    default: 0
  },
  hashtags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for efficient querying
photoSchema.index({ score: -1, createdAt: -1 });
photoSchema.index({ author: 1 });

module.exports = mongoose.model('Photo', photoSchema);
