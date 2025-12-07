import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, isFirebaseConfigured } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase is not configured, skip auth listener
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Sync auth state to extension
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || null,
          photoURL: firebaseUser.photoURL || null
        };
        localStorage.setItem('tw_user', JSON.stringify(userData));
        
        // Notify extension via postMessage
        window.postMessage({
          type: 'TWITTER_WRAPPED_AUTH',
          data: { user: userData, twitterUsername: localStorage.getItem('tw_username') || '' }
        }, window.location.origin);
        
        // Fetch additional user data from Firestore
        try {
          if (db) {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              setUserData(userDoc.data());
            }
          }
        } catch (error) {
          console.warn('Error fetching user data:', error);
        }
      } else {
        setUser(null);
        setUserData(null);
        
        // Clear extension auth on logout
        localStorage.removeItem('tw_user');
        localStorage.removeItem('tw_username');
        localStorage.removeItem('tw_lastSync');
        localStorage.removeItem('tw_latestStats');
        localStorage.removeItem('tw_stats');
        
        // Notify extension about logout
        window.postMessage({ type: 'TWITTER_WRAPPED_LOGOUT' }, window.location.origin);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Logout function that clears extension state
  const logout = async () => {
    if (auth) {
      try {
        await auth.signOut();
        console.log('[AuthContext] User logged out, extension notified');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  };

  const updateUserData = async (data) => {
    if (user && db) {
      try {
        await setDoc(doc(db, 'users', user.uid), data, { merge: true });
        setUserData(prev => {
           const newData = { ...prev, ...data };
           
           // Sync username to local storage if present
           if (data.twitterUsername) {
              localStorage.setItem('tw_username', data.twitterUsername);
              
              // Notify extension immediately
              const currentUser = JSON.parse(localStorage.getItem('tw_user') || '{}');
              window.postMessage({
                type: 'TWITTER_WRAPPED_AUTH',
                data: { user: currentUser, twitterUsername: data.twitterUsername }
              }, window.location.origin);
           }
           
           return newData;
        });
      } catch (error) {
        console.warn('Error updating user data:', error);
      }
    }
  };

  const value = {
    user,
    userData,
    loading,
    logout,
    updateUserData,
    isFirebaseConfigured
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
