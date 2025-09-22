import React, { useState, useEffect } from 'react';
import { Camera, Heart, MessageCircle, Share2, Upload, User } from 'lucide-react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

interface Comment {
  id: string;
  text: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  createdAt: string;
}

interface Photo {
  id: string;
  url: string;
  caption: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  location: string;
  score: number;
  scoreBreakdown: {
    clarity: number;
    lighting: number;
    vibrancy: number;
    creativity: number;
  };
  likes: string[];
  comments: Comment[];
  shares: number;
  hashtags: string[];
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  uid: string;
  name: string;
  displayName?: string;
  photoURL?: string;
  avatar: string;
  photos: number;
  totalScore: number;
  rank: number;
}

function App() {
  // Core state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Verify token with backend
        const idToken = await firebaseUser.getIdToken();
        try {
          const response = await fetch('http://localhost:5000/api/auth/verify-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: idToken }),
          });
          const data = await response.json();
          setCurrentUser(data.user);
        } catch (error) {
          console.error('Token verification failed:', error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch photos on component mount
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/photos?page=1&limit=20');
        if (response.ok) {
          const data = await response.json();
          setPhotos(data.photos || []);
        }
      } catch (error) {
        console.error('Error fetching photos:', error);
      }
    };

    fetchPhotos();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }
    if (!currentUser) {
      alert('Please sign in to upload photos');
      return;
    }

    setIsUploading(true);
    console.log('Starting upload...', {
      file: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type
    });

    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);
      if (caption) formData.append('caption', caption);

      // Get auth token
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Not authenticated');
      }

      console.log('Sending request to /api/photos/upload...');
      const response = await fetch('http://localhost:5000/api/photos/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
          // Let the browser set the Content-Type with the correct boundary
        },
        body: formData,
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        // Try to parse error as JSON, fall back to text
        let errorMessage = 'Upload failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(`(${response.status}) ${errorMessage}`);
      }

      // Parse successful response
      const responseData = JSON.parse(responseText);
      if (responseData.photo) {
        setPhotos(prevPhotos => [responseData.photo, ...prevPhotos]);
        setSelectedFile(null);
        setPreviewUrl('');
        setCaption('');
        alert('Photo uploaded successfully! 🎉');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading Pujomedia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-gradient-to-r from-orange-400 to-red-500">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 rounded-full">
                <Camera className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Pujomedia
                </h1>
                <p className="text-sm text-gray-600">Celebrate & Share</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {currentUser ? (
                <>
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 rounded-full">
                    <p className="text-white font-semibold text-sm">Rank #{currentUser.rank}</p>
                  </div>
                  <img 
                    src={currentUser.photoURL || currentUser.avatar} 
                    alt="Profile" 
                    className="h-10 w-10 rounded-full border-2 border-orange-400"
                  />
                  <button
                    onClick={handleSignOut}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <User className="h-5 w-5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border-2 border-orange-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Upload className="h-6 w-6 mr-2 text-orange-500" />
                Share Your Puja Moment
              </h2>
              
              {currentUser ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                      ) : (
                        <>
                          <Camera className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                          <p className="text-lg text-gray-600">Click to select a photo</p>
                          <p className="text-sm text-gray-500">JPG, PNG up to 10MB</p>
                        </>
                      )}
                    </label>
                  </div>
                  
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Share the story behind your photo..."
                    className="w-full p-4 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : 'Share Photo'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Sign in to share your Puja moments</p>
                  <button
                    onClick={handleGoogleSignIn}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Sign In with Google
                  </button>
                </div>
              )}
            </div>

            {/* Photos Feed */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Latest Puja Photos</h2>
              
              {photos.map(photo => (
                <div key={photo.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-orange-100 hover:shadow-xl transition-shadow duration-300">
                  {/* Photo Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={photo.author.avatar} 
                        alt={photo.author.name}
                        className="h-10 w-10 rounded-full border-2 border-orange-300"
                      />
                      <div>
                        <p className="font-semibold text-gray-800">{photo.author.name}</p>
                        <p className="text-sm text-gray-500">{new Date(photo.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 rounded-full">
                      <p className="text-white font-bold text-sm">⭐ {photo.score}</p>
                    </div>
                  </div>

                  {/* Photo */}
                  <img 
                    src={photo.url} 
                    alt={photo.caption}
                    className="w-full h-96 object-cover"
                  />

                  {/* Photo Content */}
                  <div className="p-4 space-y-3">
                    <p className="text-gray-800 leading-relaxed">{photo.caption}</p>
                    
                    {/* Hashtags */}
                    {photo.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {photo.hashtags.map((tag, index) => (
                          <span key={index} className="text-orange-600 hover:text-orange-700 cursor-pointer">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 border-t border-orange-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-6">
                          <button className="flex items-center space-x-2 text-gray-600 hover:text-red-500 transition-colors">
                            <Heart className="h-5 w-5" />
                            <span>{photo.likes.length}</span>
                          </button>
                          <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-500 transition-colors">
                            <MessageCircle className="h-5 w-5" />
                            <span>{photo.comments.length}</span>
                          </button>
                          <button className="flex items-center space-x-2 text-gray-600 hover:text-green-500 transition-colors">
                            <Share2 className="h-5 w-5" />
                            <span>{photo.shares}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Profile Widget */}
            {currentUser && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
                <div className="text-center">
                  <img 
                    src={currentUser.photoURL || currentUser.avatar} 
                    alt="Profile"
                    className="h-20 w-20 rounded-full mx-auto mb-4 border-4 border-orange-300"
                  />
                  <h3 className="text-xl font-bold text-gray-800">{currentUser.displayName || currentUser.name}</h3>
                  <p className="text-orange-600 font-semibold">Rank #{currentUser.rank}</p>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{currentUser.photos}</p>
                      <p className="text-sm text-gray-600">Photos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{currentUser.totalScore}</p>
                      <p className="text-sm text-gray-600">Score</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
