const axios = require('axios');

class AIService {
  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  }

  async analyzePujaPhoto(imageBuffer) {
    try {
      // In a real implementation, this would call your AI service
      // For now, we'll return mock scores
      return this.mockAnalyzePujaPhoto(imageBuffer);
    } catch (error) {
      console.error('AI service error:', error);
      throw new Error('Failed to analyze photo');
    }
  }

  async mockAnalyzePujaPhoto(imageBuffer) {
    // Mock implementation - in a real app, this would call your AI service
    return new Promise((resolve) => {
      // Simulate AI processing time
      setTimeout(() => {
        const score = Math.floor(Math.random() * 40) + 60; // Random score between 60-100
        resolve({
          score,
          breakdown: {
            clarity: Math.floor(Math.random() * 20) + 80,
            composition: Math.floor(Math.random() * 20) + 70,
            colors: Math.floor(Math.random() * 20) + 75,
            culturalElements: Math.floor(Math.random() * 20) + 80,
            uniqueness: Math.floor(Math.random() * 20) + 65
          },
          feedback: [
            'Great use of colors and composition!',
            'Consider improving the lighting for better clarity.',
            'The cultural elements are well represented.'
          ]
        });
      }, 1000);
    });
  }
}

module.exports = new AIService();
