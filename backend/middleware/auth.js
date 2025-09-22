const { auth } = require('../firebase');

const authenticateToken = async (req, res, next) => {
  // Skip authentication for health check endpoint
  if (req.path === '/api/health') {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Development bypass (commented out to use real authentication)
  // if (process.env.NODE_ENV === 'development' || process.env.DEV_FAKE_UPLOAD === 'true') {
  //   console.log('Development mode: Bypassing authentication');
  //   req.user = { 
  //     uid: 'dev-user', 
  //     email: 'dev@example.com', 
  //     name: 'Dev User', 
  //     picture: '',
  //     email_verified: true
  //   };
  //   return next();
  // }

  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'No authorization token was found',
      code: 'MISSING_AUTH_TOKEN'
    });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    
    // Try to get additional user info from Firebase Auth
    let userRecord = null;
    try {
      userRecord = await auth.getUser(decodedToken.uid);
    } catch (userErr) {
      console.log('Could not fetch user record:', userErr.message);
    }
    
    // Use Firebase Auth user record data if available, otherwise use token data
    const displayName = userRecord?.displayName || decodedToken.name || decodedToken.email?.split('@')[0] || 'Anonymous';
    const photoURL = userRecord?.photoURL || decodedToken.picture || '';
    
    req.user = { 
      uid: decodedToken.uid, 
      email: decodedToken.email, 
      name: displayName,
      displayName: displayName,
      picture: photoURL,
      photoURL: photoURL,
      email_verified: decodedToken.email_verified || false
    };
    
    console.log('Authenticated user:', {
      uid: req.user.uid,
      name: req.user.name,
      picture: req.user.picture ? 'has photo' : 'no photo'
    });
    
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(403).json({ 
      error: 'Authentication failed',
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
};

module.exports = { authenticateToken };
