import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db, isFirebaseConfigured } from '../firebase/config';
import { Twitter, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';
import './Auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const twitterUsername = sessionStorage.getItem('twitterUsername');

  // Notify extension about successful login
  const notifyExtension = (user) => {
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null
    };
    
    // Save to localStorage for extension to pick up
    localStorage.setItem('tw_user', JSON.stringify(userData));
    if (twitterUsername) {
      localStorage.setItem('tw_username', twitterUsername);
    }
    
    // Send postMessage for immediate sync
    window.postMessage({
      type: 'TWITTER_WRAPPED_AUTH',
      data: {
        user: userData,
        twitterUsername: twitterUsername || ''
      }
    }, window.location.origin);
    
    console.log('[Auth] Notified extension about login');
  };

  const saveUserData = async (user) => {
    if (!db) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          twitterUsername: twitterUsername || '',
          createdAt: new Date().toISOString(),
          lastSync: null
        });
      } else if (twitterUsername && !userSnap.data().twitterUsername) {
        await setDoc(userRef, { twitterUsername }, { merge: true });
      }
    } catch (error) {
      console.warn('Error saving user data:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured || !auth) {
      setError('Firebase is not configured. Please add your Firebase credentials.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await saveUserData(result.user);
      notifyExtension(result.user);
      navigate('/dashboard');
    } catch (err) {
      console.error('Google sign in error:', err);
      setError('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    
    if (!isFirebaseConfigured || !auth) {
      setError('Firebase is not configured. Please add your Firebase credentials.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await signInWithEmailAndPassword(auth, email, password);
      } else {
        result = await createUserWithEmailAndPassword(auth, email, password);
      }
      await saveUserData(result.user);
      notifyExtension(result.user);
      navigate('/dashboard');
    } catch (err) {
      console.error('Email auth error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters');
      } else {
        setError('An error occurred. Please try again.');
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
            <Twitter size={28} />
          </div>
          <h1>{isLogin ? 'Sign In' : 'Create Account'}</h1>
          {twitterUsername && (
            <p className="twitter-info">Continue as @{twitterUsername}</p>
          )}
        </div>

        <motion.button
          className="google-button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </motion.button>

        <div className="divider">
          <span>or</span>
        </div>

        <form className="auth-form" onSubmit={handleEmailAuth}>
          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <motion.button
            type="submit"
            className="submit-btn"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <Loader2 size={20} className="spinner" />
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </motion.button>
        </form>

        <p className="auth-switch">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
