import React, { useState, useEffect } from 'react';
import { Camera, Heart, MessageCircle, Share2, Upload, User, Home, Trophy, LogOut, Clock, Edit3, Settings } from 'lucide-react';
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
  // Helper function to generate fallback avatar
  const generateFallbackAvatar = (name: string, size: number = 40) => {
    const initial = name.charAt(0).toUpperCase();
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ff6b35';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(size * 0.4)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initial, size / 2, size / 2);
      return canvas.toDataURL();
    }
    return '';
  };

  // Core state
  const [activeTab, setActiveTab] = useState('home'); // Start with home tab for all users
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  
  // Engagement state
  const [activeCommentPhoto, setActiveCommentPhoto] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [leaderboardPhotos, setLeaderboardPhotos] = useState<Photo[]>([]);
  const [leaderboardUsers, setLeaderboardUsers] = useState<User[]>([]);
  const [userPhotos, setUserPhotos] = useState<Photo[]>([]);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    displayName: '',
    bio: '',
    profilePicture: null as File | null
  });
  const [profilePicturePreview, setProfilePicturePreview] = useState('');

  // Simplified helper function to create user object
  const createUserObject = (firebaseUser: any, profileData?: any) => ({
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    name: profileData?.displayName || firebaseUser.displayName || 'Anonymous',
    displayName: profileData?.displayName || firebaseUser.displayName || 'Anonymous',
    photoURL: profileData?.photoURL || firebaseUser.photoURL,
    avatar: profileData?.avatar || profileData?.photoURL || firebaseUser.photoURL || '',
    bio: profileData?.bio || '',
    photos: profileData?.photos || 0,
    totalScore: profileData?.totalScore || 0,
    rank: profileData?.rank || 999
  });

  // Firebase auth state listener - OPTIMIZED with timeout
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Set user immediately with Firebase data to show UI faster
          setCurrentUser(createUserObject(firebaseUser));
          
          // Try to get backend profile data with timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 3000) // 3 second timeout
          );
          
          try {
            const idToken = await firebaseUser.getIdToken();
            
            const profileResponse = await Promise.race([
              fetch(`http://localhost:5000/api/users/profile/${firebaseUser.uid}`, {
                headers: { 'Authorization': `Bearer ${idToken}` }
              }),
              timeoutPromise
            ]);

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              setCurrentUser(createUserObject(firebaseUser, profileData.user));
            }
          } catch (profileError) {
            console.log('Profile fetch failed, using Firebase data:', profileError.message);
            // Already set user above, so just continue
          }
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Auth error:', error);
        setCurrentUser(null);
      } finally {
        // ALWAYS set loading to false, no matter what happens
        setIsLoading(false);
      }
    });

    // Also set a maximum loading timeout as backup
    const maxLoadingTimeout = setTimeout(() => {
      console.log('Max loading timeout reached, forcing app to show');
      setIsLoading(false);
    }, 5000); // 5 second maximum loading time

    return () => {
      unsubscribe();
      clearTimeout(maxLoadingTimeout);
    };
  }, []);

  // SIMPLIFIED: Data fetcher with offline mode
  useEffect(() => {
    const fetchAllAppData = async () => {
      console.log('Attempting to fetch app data...');
      
      try {
        // Quick health check first
        const healthResponse = await Promise.race([
          fetch('http://localhost:5000/api/health'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Health timeout')), 5000))
        ]) as Response;
        
        if (healthResponse.ok) {
          console.log('Backend is healthy, fetching data...');
          
          // Fetch photos with timeout
          const photosResponse = await Promise.race([
            fetch('http://localhost:5000/api/photos?page=1&limit=100'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Photos timeout')), 5000))
          ]) as Response;
          
          if (photosResponse.ok) {
            const photosData = await photosResponse.json();
            const allPhotos = photosData.photos || [];
            setPhotos(allPhotos);
            console.log(`Successfully loaded ${allPhotos.length} photos`);
          }
          
          // Try to fetch leaderboard data (optional)
          fetch('http://localhost:5000/api/leaderboard/photos')
            .then(res => res.json())
            .then((data: any) => {
              console.log('Leaderboard photos loaded:', data.photos?.length || 0);
              setLeaderboardPhotos(data.photos || []);
            })
            .catch(() => console.log('Leaderboard photos failed (non-critical)'));
            
          fetch('http://localhost:5000/api/leaderboard/users')
            .then(res => res.json())
            .then((data: any) => {
              console.log('Leaderboard users loaded:', data.users?.length || 0, data.users);
              setLeaderboardUsers(data.users || []);
            })
            .catch(() => console.log('Leaderboard users failed (non-critical)'));
            
        } else {
          throw new Error('Backend health check failed');
        }
        
      } catch (error) {
        console.error('Backend not available:', error);
        console.log('Running in offline mode - some features may be limited');
        
        // Set empty arrays for offline mode
        setPhotos([]);
        setLeaderboardPhotos([]);
        setLeaderboardUsers([]);
        
        // Show user a message about offline mode
        setTimeout(() => {
          alert('⚠️ Server connection failed. Running in offline mode.\n\nSome features like photo upload may not work.\nPlease check if the backend server is running.');
        }, 1000);
      }
    };

    // Fetch data immediately on app load
    fetchAllAppData();
  }, []); // Only run once on mount

  // Update user photos when currentUser changes
  useEffect(() => {
    if (currentUser && photos.length > 0) {
      const userSpecificPhotos = photos.filter(
        photo => photo.author.id === currentUser.uid || photo.author.id === currentUser.id
      );
      setUserPhotos(userSpecificPhotos);
    }
  }, [currentUser, photos]);

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

    // First check if backend is responding
    try {
      const healthCheck = await Promise.race([
        fetch('http://localhost:5000/api/health'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000))
      ]) as Response;
      
      if (!healthCheck.ok) {
        throw new Error('Backend not responding');
      }
      console.log('Backend health check passed');
    } catch (healthError) {
      console.error('Backend health check failed:', healthError);
      alert('Server is not responding. Please try again in a moment.');
      setIsUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);
      if (caption) formData.append('caption', caption);

      // Get auth token
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Not authenticated');
      }

      // Debug: Log current user info
      console.log('Current user info for upload:', {
        uid: currentUser.uid,
        name: currentUser.name,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        avatar: currentUser.avatar
      });

      console.log('Sending request to /api/photos/upload...');
      
      // Create upload timeout (30 seconds for large files)
      const uploadTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Upload timeout - please try again')), 30000)
      );
      
      const uploadPromise = fetch('http://localhost:5000/api/photos/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
          // Let the browser set the Content-Type with the correct boundary
        },
        body: formData,
      });
      
      const response = await Promise.race([uploadPromise, uploadTimeout]);

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
        // Add new photo to the beginning of the list
        setPhotos(prevPhotos => [responseData.photo, ...prevPhotos]);
        
        // Also refresh all photos to ensure we have the latest data
        fetch('http://localhost:5000/api/photos?page=1&limit=100')
          .then(res => res.json())
          .then(data => {
            if (data.photos) {
              setPhotos(data.photos);
            }
          })
          .catch(console.error);
        
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

  // Toggle like on a photo
  const toggleLike = async (photoId: string) => {
    if (!currentUser) {
      alert('Please sign in to like photos');
      return;
    }
    
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      
      const response = await fetch(`http://localhost:5000/api/photos/${photoId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Update the photo in the photos array
        setPhotos(prevPhotos => 
          prevPhotos.map(photo => 
            photo.id === photoId
              ? {
                  ...photo,
                  likes: photo.likes.includes(currentUser.uid)
                    ? photo.likes.filter(id => id !== currentUser.uid)
                    : [...photo.likes, currentUser.uid]
                }
              : photo
          )
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Toggle comments section
  const toggleComments = (photoId: string) => {
    setActiveCommentPhoto(activeCommentPhoto === photoId ? null : photoId);
    setNewComment('');
  };

  // Add comment to photo
  const addComment = async (photoId: string) => {
    if (!newComment.trim() || !currentUser) return;
    
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      
      const response = await fetch(`http://localhost:5000/api/photos/${photoId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: newComment })
      });
      
      if (response.ok) {
        const result = await response.json();
        // Update the photo with new comment
        setPhotos(prevPhotos => 
          prevPhotos.map(photo => 
            photo.id === photoId
              ? {
                  ...photo,
                  comments: [...photo.comments, result.comment]
                }
              : photo
          )
        );
        setNewComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Share photo
  const sharePhoto = async (photo: Photo) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this Puja photo!',
          text: photo.caption,
          url: photo.url
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(photo.url);
        alert('Photo link copied to clipboard!');
      }
      
      // Update share count
      setPhotos(prevPhotos => 
        prevPhotos.map(p => 
          p.id === photo.id 
            ? { ...p, shares: p.shares + 1 }
            : p
        )
      );
    } catch (error) {
      console.error('Error sharing photo:', error);
    }
  };

  // Open edit profile modal
  const openEditProfile = () => {
    if (currentUser) {
      setEditProfileData({
        displayName: currentUser.displayName || currentUser.name || '',
        bio: '', // Add bio field to user interface later
        profilePicture: null
      });
      setProfilePicturePreview(currentUser.photoURL || currentUser.avatar);
      setIsEditingProfile(true);
    }
  };

  // Handle profile picture selection
  const handleProfilePictureSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setEditProfileData(prev => ({ ...prev, profilePicture: file }));
      const url = URL.createObjectURL(file);
      setProfilePicturePreview(url);
    }
  };

  // Save profile changes
  const saveProfileChanges = async () => {
    if (!currentUser) return;
    
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      console.log('Saving profile changes:', {
        displayName: editProfileData.displayName,
        bio: editProfileData.bio,
        hasProfilePicture: !!editProfileData.profilePicture,
        profilePictureSize: editProfileData.profilePicture?.size,
        profilePictureName: editProfileData.profilePicture?.name
      });

      const formData = new FormData();
      formData.append('displayName', editProfileData.displayName);
      formData.append('bio', editProfileData.bio);
      
      if (editProfileData.profilePicture) {
        formData.append('profilePicture', editProfileData.profilePicture);
        console.log('Profile picture added to FormData:', editProfileData.profilePicture.name);
      }

      console.log('Sending request to:', 'http://localhost:5000/api/users/profile');

      const response = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const updatedUser = await response.json();
        console.log('Profile update response:', updatedUser);
        setCurrentUser(prev => prev ? { ...prev, ...updatedUser.user } : null);
        setIsEditingProfile(false);
        alert('Profile updated successfully!');
        
        // Refresh user photos to reflect any changes
        if (activeTab === 'profile') {
          const photosResponse = await fetch(`http://localhost:5000/api/photos/profile/${currentUser.uid}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (photosResponse.ok) {
            const photosData = await photosResponse.json();
            setUserPhotos(photosData.photos || []);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('Profile update failed:', response.status, errorText);
        alert(`Failed to update profile: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <img 
            src="/pujo-media-logo.png" 
            alt="Pujo Media Logo" 
            className="h-24 w-24 mx-auto mb-4 animate-pulse"
          />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading Pujo_media...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-gradient-to-r from-orange-400 to-red-500 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <img 
                src="/pujo-media-logo.png" 
                alt="Pujo Media Logo" 
                className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain"
              />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent truncate">
                  Pujo_media
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Celebrate & Share</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2">
              {currentUser ? (
                <>
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded-full">
                    <p className="text-white font-semibold text-xs sm:text-sm">#{currentUser.rank}</p>
                  </div>
                  <img 
                    src={currentUser.photoURL || currentUser.avatar} 
                    alt="Profile" 
                    className="h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 rounded-full border-2 border-orange-400"
                    onError={(e) => {
                      console.log('Profile image failed to load:', currentUser.photoURL || currentUser.avatar);
                      e.currentTarget.src = generateFallbackAvatar(currentUser.name, 40);
                    }}
                  />
                  <button
                    onClick={handleSignOut}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden md:inline text-sm">Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 sm:px-4 lg:px-6 py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 flex items-center space-x-1 sm:space-x-2"
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-white shadow-md border-b border-orange-100 sticky top-16 sm:top-20 z-30">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 lg:space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'home'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-orange-500'
              }`}
            >
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-medium text-sm sm:text-base">Home</span>
            </button>
            
            {currentUser ? (
              <>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'upload'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-orange-500'
                  }`}
                >
                  <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-medium text-sm sm:text-base">Upload</span>
                </button>
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'leaderboard'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-orange-500'
                  }`}
                >
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-medium text-sm sm:text-base hidden xs:inline">Leaderboard</span>
                  <span className="font-medium text-sm sm:text-base xs:hidden">Ranks</span>
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'profile'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-orange-500'
                  }`}
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-medium text-sm sm:text-base">Profile</span>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-4 py-4">
                <span className="text-gray-500 text-sm">Sign in to access Upload, Leaderboard & Profile</span>
                <button
                  onClick={handleGoogleSignIn}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Home Tab - Instagram-like Feed */}
        {activeTab === 'home' && (
          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
            {photos.map(photo => (
              <div key={photo.id} className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-orange-100 hover:shadow-xl transition-shadow duration-300">
                {/* Photo Header */}
                <div className="p-3 sm:p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                    <img 
                      src={photo.author.avatar} 
                      alt={photo.author.name}
                      className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-orange-300 object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = generateFallbackAvatar(photo.author.name, 40);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 hover:text-orange-600 cursor-pointer text-sm sm:text-base truncate">
                        {photo.author.name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{new Date(photo.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-2 sm:px-3 py-1 rounded-full flex-shrink-0">
                    <p className="text-white font-bold text-xs sm:text-sm">⭐ {photo.score}</p>
                  </div>
                </div>

                {/* Photo */}
                <img 
                  src={photo.url} 
                  alt={photo.caption}
                  className="w-full h-64 sm:h-80 lg:h-96 object-cover"
                />

                {/* Photo Content */}
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 sm:space-x-6">
                      <button 
                        onClick={() => currentUser ? toggleLike(photo.id) : alert('Please sign in to like photos')}
                        className={`flex items-center space-x-1 sm:space-x-2 transition-colors ${
                          currentUser && photo.likes.includes(currentUser.uid)
                            ? 'text-red-500'
                            : 'text-gray-600 hover:text-red-500'
                        }`}
                      >
                        <Heart className={`h-5 w-5 sm:h-6 sm:w-6 ${currentUser && photo.likes.includes(currentUser.uid) ? 'fill-current' : ''}`} />
                        <span className="font-medium text-sm sm:text-base">{photo.likes.length}</span>
                      </button>
                      <button 
                        onClick={() => currentUser ? toggleComments(photo.id) : alert('Please sign in to comment on photos')}
                        className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-blue-500 transition-colors"
                      >
                        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span className="font-medium text-sm sm:text-base">{photo.comments.length}</span>
                      </button>
                      <button 
                        onClick={() => currentUser ? sharePhoto(photo) : alert('Please sign in to share photos')}
                        className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-green-500 transition-colors"
                      >
                        <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span className="font-medium text-sm sm:text-base">{photo.shares}</span>
                      </button>
                    </div>
                  </div>

                  {/* Caption */}
                  <div>
                    <p className="text-gray-800 leading-relaxed">
                      <span className="font-semibold">{photo.author.name}</span> {photo.caption}
                    </p>
                  </div>
                  
                  {/* Hashtags */}
                  {photo.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {photo.hashtags.map((tag, index) => (
                        <span key={index} className="text-orange-600 hover:text-orange-700 cursor-pointer font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Comments Section */}
                  {activeCommentPhoto === photo.id && (
                    <div className="border-t border-gray-100 pt-4 mt-4">
                      {/* Existing Comments */}
                      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                        {photo.comments.map(comment => (
                          <div key={comment.id} className="flex space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                            <img 
                              src={comment.author.avatar} 
                              alt={comment.author.name}
                              className="h-8 w-8 rounded-full object-cover border border-orange-200"
                              onError={(e) => {
                                e.currentTarget.src = generateFallbackAvatar(comment.author.name, 32);
                              }}
                            />
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-semibold text-gray-800 hover:text-orange-600 cursor-pointer">
                                  {comment.author.name}
                                </span>{' '}
                                <span className="text-gray-700">{comment.text}</span>
                              </p>
                              <p className="text-xs text-gray-500 mt-1 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Add Comment */}
                      {currentUser && (
                        <div className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
                          <img 
                            src={currentUser.photoURL || currentUser.avatar} 
                            alt="Your avatar"
                            className="h-8 w-8 rounded-full object-cover border border-orange-200"
                            onError={(e) => {
                              e.currentTarget.src = generateFallbackAvatar(currentUser.name, 32);
                            }}
                          />
                          <div className="flex-1 flex space-x-2">
                            <input
                              type="text"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder={`Comment as ${currentUser.name}...`}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                              onKeyPress={(e) => e.key === 'Enter' && addComment(photo.id)}
                            />
                            <button
                              onClick={() => addComment(photo.id)}
                              disabled={!newComment.trim()}
                              className="px-4 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                              Post
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Tab - Only for logged in users */}
        {activeTab === 'upload' && currentUser && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-orange-100">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                <Upload className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-orange-500" />
                <span className="truncate">Share Your Puja Moment</span>
              </h2>
              
              {currentUser ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-orange-300 rounded-lg p-4 sm:p-6 lg:p-8 text-center hover:border-orange-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer block">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="max-h-48 sm:max-h-64 mx-auto rounded-lg" />
                      ) : (
                        <>
                          <Camera className="h-12 w-12 sm:h-16 sm:w-16 text-orange-400 mx-auto mb-3 sm:mb-4" />
                          <p className="text-base sm:text-lg text-gray-600">Click to select a photo</p>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">JPG, PNG up to 10MB</p>
                        </>
                      )}
                    </label>
                  </div>
                  
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Share the story behind your photo..."
                    className="w-full p-3 sm:p-4 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm sm:text-base"
                    rows={3}
                  />
                  
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-4 sm:px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
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
          </div>
        )}

        {/* Leaderboard Tab - Only for logged in users */}
        {activeTab === 'leaderboard' && currentUser && (
          <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
            {/* Top Photos Leaderboard */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-orange-100">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-orange-500" />
                <span>Top Photos</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {leaderboardPhotos.map((photo, index) => (
                  <div key={photo.id} className="relative group">
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs sm:text-sm font-bold z-10">
                      #{index + 1}
                    </div>
                    <img 
                      src={photo.url} 
                      alt={photo.caption}
                      className="w-full h-40 sm:h-48 object-cover rounded-lg"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 rounded-b-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <img 
                            src={photo.author.avatar} 
                            alt={photo.author.name}
                            className="h-6 w-6 rounded-full border border-white/50 object-cover"
                            onError={(e) => {
                              e.currentTarget.src = generateFallbackAvatar(photo.author.name, 24);
                            }}
                          />
                          <p className="text-white/90 text-xs font-medium">{photo.author.name}</p>
                        </div>
                        <p className="text-white font-semibold text-sm">⭐ {photo.score}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Users Leaderboard */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-orange-100">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-orange-500" />
                <span>Top Users</span>
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {leaderboardUsers.length > 0 ? leaderboardUsers.map((user, index) => (
                  <div key={user.id} className={`flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-lg ${
                    user.id === currentUser?.id ? 'bg-orange-50 border-2 border-orange-200' : 'bg-gray-50'
                  }`}>
                    <div className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full font-bold text-xs sm:text-sm ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-2 border-orange-300 object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = generateFallbackAvatar(user.name, 48);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{user.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">{user.photos} photos</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg sm:text-xl font-bold text-orange-600">{user.totalScore}</p>
                      <p className="text-xs sm:text-sm text-gray-500">points</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No users in leaderboard yet</p>
                    <p className="text-gray-500">Upload photos to start competing!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && currentUser && (
          <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
            {/* Profile Header */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-orange-100">
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 lg:space-x-8">
                <div className="relative flex-shrink-0">
                  <img
                    src={currentUser.photoURL || currentUser.avatar}
                    alt="Profile"
                    className="h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 rounded-full border-4 border-orange-300 object-cover"
                    onError={(e) => {
                      console.log('Large profile image failed to load:', currentUser.photoURL || currentUser.avatar);
                      e.currentTarget.src = generateFallbackAvatar(currentUser.name, 128);
                    }}
                  />
                  <button className="absolute bottom-0 right-0 bg-orange-500 text-white p-1.5 sm:p-2 rounded-full hover:bg-orange-600 transition-colors">
                    <Edit3 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </div>
                
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-3 sm:mb-4">
                    <div className="min-w-0">
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 truncate">
                        {currentUser.displayName || currentUser.name}
                      </h1>
                      <p className="text-orange-600 font-semibold text-base sm:text-lg">Rank #{currentUser.rank}</p>
                    </div>
                    <button 
                      onClick={openEditProfile}
                      className="mt-3 lg:mt-0 bg-orange-500 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2 mx-auto sm:mx-0"
                    >
                      <Settings className="h-4 w-4" />
                      <span className="text-sm sm:text-base">Edit Profile</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 sm:gap-6 lg:gap-8 text-center">
                    <div>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{userPhotos.length}</p>
                      <p className="text-xs sm:text-sm text-gray-600">Photos</p>
                    </div>
                    <div>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{currentUser.totalScore}</p>
                      <p className="text-xs sm:text-sm text-gray-600">Total Score</p>
                    </div>
                    <div>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
                        {userPhotos.reduce((sum, photo) => sum + photo.likes.length, 0)}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">Likes</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Photos Grid */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-orange-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">My Photos</h2>
              {userPhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  {userPhotos.map(photo => (
                    <div key={photo.id} className="relative group cursor-pointer">
                      <img 
                        src={photo.url} 
                        alt={photo.caption}
                        className="w-full h-32 sm:h-40 md:h-48 lg:h-56 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-center p-2">
                          <p className="font-bold text-sm sm:text-base lg:text-lg">⭐ {photo.score}</p>
                          <div className="flex items-center justify-center space-x-2 sm:space-x-4 mt-1 sm:mt-2">
                            <span className="flex items-center space-x-1">
                              <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="text-xs sm:text-sm">{photo.likes.length}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="text-xs sm:text-sm">{photo.comments.length}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <Camera className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-gray-600 text-base sm:text-lg">No photos yet</p>
                  <p className="text-gray-500 text-sm sm:text-base">Start sharing your Puja moments!</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-3 sm:mt-4 bg-orange-500 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm sm:text-base"
                  >
                    Upload Your First Photo
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sign In Prompt for Non-Authenticated Users trying to access restricted tabs */}
        {!currentUser && (activeTab === 'upload' || activeTab === 'leaderboard' || activeTab === 'profile') && (
          <div className="max-w-2xl mx-auto text-center py-8 sm:py-12 lg:py-16">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 border border-orange-100">
              <div className="mb-4 sm:mb-6">
                {activeTab === 'upload' && <Upload className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 text-orange-400 mx-auto" />}
                {activeTab === 'leaderboard' && <Trophy className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 text-orange-400 mx-auto" />}
                {activeTab === 'profile' && <User className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 text-orange-400 mx-auto" />}
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-3 sm:mb-4">Sign In Required</h2>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 px-2">
                {activeTab === 'upload' && 'Sign in to upload and share your beautiful Puja moments!'}
                {activeTab === 'leaderboard' && 'Sign in to view leaderboards and compete with others!'}
                {activeTab === 'profile' && 'Sign in to create your profile and manage your photos!'}
              </p>
              <div className="space-y-3 sm:space-y-4">
                <button
                  onClick={handleGoogleSignIn}
                  className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 flex items-center space-x-2 sm:space-x-3 mx-auto text-sm sm:text-base"
                >
                  <User className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>Sign In with Google</span>
                </button>
                <button
                  onClick={() => setActiveTab('home')}
                  className="text-orange-600 hover:text-orange-700 font-medium text-sm sm:text-base"
                >
                  ← Back to Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-sm sm:max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Edit Profile</h2>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl p-1"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {/* Profile Picture */}
                  <div className="text-center">
                    <div className="relative inline-block">
                      <img
                        src={profilePicturePreview}
                        alt="Profile Preview"
                        className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-orange-300 object-cover"
                        onError={(e) => {
                          console.log('Profile preview image failed to load:', profilePicturePreview);
                          e.currentTarget.src = generateFallbackAvatar(currentUser?.name || 'U', 96);
                        }}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureSelect}
                        className="hidden"
                        id="profile-picture-upload"
                      />
                      <label
                        htmlFor="profile-picture-upload"
                        className="absolute bottom-0 right-0 bg-orange-500 text-white p-1.5 sm:p-2 rounded-full hover:bg-orange-600 transition-colors cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </label>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 mt-2">Click the edit icon to change your profile picture</p>
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editProfileData.displayName}
                      onChange={(e) => setEditProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Enter your display name"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={editProfileData.bio}
                      onChange={(e) => setEditProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm sm:text-base"
                      rows={3}
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveProfileChanges}
                      className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm sm:text-base"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
