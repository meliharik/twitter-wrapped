import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, twitterProvider, db, isFirebaseConfigured } from '../firebase/config';
import { Twitter, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';
import './Auth.css';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const sessionUsername = sessionStorage.getItem('twitterUsername');

  // Notify extension about successful login
  const notifyExtension = (user) => {
    // If we have a session username, prefer it, otherwise try to use screen_name from provider data if available
    // Firebase Twitter Auth usually puts the handle in reloadUserInfo.screenName, but it's internal.
    // user.reloadUserInfo.screenName
    const handle = // Try to find handle in provider data
       user.reloadUserInfo?.screenName || 
       sessionUsername || 
       '';

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      username: handle 
    };
    
    // Save to localStorage
    localStorage.setItem('tw_user', JSON.stringify(userData));
    if (handle) {
      localStorage.setItem('tw_username', handle);
    }
    
    // Send postMessage for immediate sync
    window.postMessage({
      type: 'TWITTER_WRAPPED_AUTH',
      data: {
        user: userData,
        twitterUsername: handle
      }
    }, window.location.origin);
  };

  const saveUserData = async (user) => {
    if (!db) return;
    
    // Attempt to extract handle from Firebase internal property (safe for Twitter provider)
    // @ts-ignore
    const twitterHandle = user.reloadUserInfo?.screenName || sessionUsername || '';

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      const payload = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: new Date().toISOString()
      };

      if (twitterHandle) {
          payload.twitterUsername = twitterHandle;
      }
      
      if (!userSnap.exists()) {
        payload.createdAt = new Date().toISOString();
        await setDoc(userRef, payload);
      } else {
        await setDoc(userRef, payload, { merge: true });
      }
    } catch (error) {
      console.warn('Error saving user data:', error);
    }
  };

  const handleTwitterSignIn = async () => {
    if (!isFirebaseConfigured || !auth) {
      setError('Firebase is not configured. Please add your config in .env');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await signInWithPopup(auth, twitterProvider);
      // The signed-in user info.
      const user = result.user;
      
      await saveUserData(user);
      notifyExtension(user);
      navigate('/dashboard');
    } catch (err) {
      console.error('Twitter sign in error:', err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email address but different sign-in credentials.');
      } else if (err.code === 'auth/popup-closed-by-user') {
          setError('Sign in cancelled.');
      } else {
        setError('Failed to sign in with Twitter. Please make sure "Twitter" is enabled in Firebase Console.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AnimatedBackground variant="blue" />
      
      <motion.button
        className="back-button"
        onClick={() => navigate('/')}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: -5 }}
      >
        <ArrowLeft size={20} />
        Back
      </motion.button>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-header">
          <div className="auth-icon">
            <Twitter size={28} fill="white" />
          </div>
          <h1>Connect Account</h1>
          <p className="twitter-info">
             Link your X account to reveal your 2025 Wrapped.
          </p>
        </div>

        {error && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="error-banner"
                style={{
                  background: 'rgba(244, 33, 46, 0.1)',
                  border: '1px solid rgba(244, 33, 46, 0.3)',
                  padding: '12px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'start',
                  color: '#f4212e', // Twitter red
                  fontSize: '0.9rem'
                }}
            >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
            </motion.div>
        )}

        <motion.button
          className="submit-btn" // Re-using styling but black/white twitter style
          style={{ 
             background: '#fff', 
             color: '#000',
             height: '56px',
             fontSize: '1.1rem',
             gap: '12px'
          }}
          onClick={handleTwitterSignIn}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <Loader2 size={24} className="spinner" />
          ) : (
            <>
               <Twitter size={24} fill="black" />
               Sign in with X
            </>
          )}
        </motion.button>
        
        <p className="auth-switch" style={{ marginTop: '30px', fontSize: '0.8rem', opacity: 0.6 }}>
           By continuing, you agree to allow us to view your public profile information.
        </p>

      </motion.div>
    </div>
  );
};

export default Auth;
