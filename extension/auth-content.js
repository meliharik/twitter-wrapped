// auth-content.js - Runs on localhost:5173 to sync auth between extension and web app
// Bidirectional sync: Website ↔ Extension

console.log('[Twitter Wrapped] Auth sync content script loaded');

let recentlyLoggedOut = false;
let extensionValid = true;

// Check if extension context is still valid
function isExtensionValid() {
  try {
    // This will throw if extension context is invalidated
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

// Helper to safely execute Chrome API calls (sync version)
function safeChromeCall(callback) {
  if (!extensionValid || !isExtensionValid()) {
    extensionValid = false;
    return false;
  }
  
  try {
    callback();
    return true;
  } catch (e) {
    if (e.message && e.message.includes('Extension context invalidated')) {
      extensionValid = false;
      console.warn('[Twitter Wrapped] Extension was reloaded. Please refresh this page to reconnect.');
    } else {
      console.error('[Twitter Wrapped] Chrome API Error:', e);
    }
    return false;
  }
}

// Helper to safely execute Chrome API calls (async version)
async function safeChromeCallAsync(asyncCallback) {
  if (!extensionValid || !isExtensionValid()) {
    extensionValid = false;
    return null;
  }
  
  try {
    return await asyncCallback();
  } catch (e) {
    if (e.message && e.message.includes('Extension context invalidated')) {
      extensionValid = false;
      console.warn('[Twitter Wrapped] Extension was reloaded. Please refresh this page to reconnect.');
    } else {
      console.error('[Twitter Wrapped] Chrome API Error:', e);
    }
    return null;
  }
}

// Listen for messages from the web page (Website → Extension)
window.addEventListener('message', (event) => {
  // Only accept messages from same origin
  if (event.origin !== window.location.origin) {
    return;
  }

  const { type, data } = event.data;

  if (type === 'TWITTER_WRAPPED_AUTH') {
    console.log('[Twitter Wrapped] Received auth data from website');
    recentlyLoggedOut = false;

    safeChromeCall(() => {
      chrome.storage.local.set({
        user: data.user,
        twitterUsername: data.twitterUsername || ''
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[Twitter Wrapped] Storage set error:', chrome.runtime.lastError);
          return;
        }
        console.log('[Twitter Wrapped] Auth synced to extension storage');
        window.dispatchEvent(new Event('TWITTER_WRAPPED_AUTH_CHANGE'));
      });
    });
  } else if (type === 'TWITTER_WRAPPED_LOGOUT') {
    console.log('[Twitter Wrapped] Received logout from website');
    recentlyLoggedOut = true;
    setTimeout(() => recentlyLoggedOut = false, 5000);

    safeChromeCall(() => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          console.warn('[Twitter Wrapped] Storage clear error:', chrome.runtime.lastError);
          return;
        }
        console.log('[Twitter Wrapped] Extension storage cleared');
        window.dispatchEvent(new Event('TWITTER_WRAPPED_AUTH_CHANGE'));
      });
    });
  } else if (type === 'REQUEST_EXTENSION_DATA') {
    console.log('[Twitter Wrapped] Web app requested extension data');
    syncDataToWebApp();
  }
});

// Sync extension data to localStorage for web app to read (Extension → Website)
async function syncDataToWebApp() {
  const storage = await safeChromeCallAsync(() => 
    chrome.storage.local.get(['user', 'twitterUsername', 'lastSync', 'latestStats', 'stats'])
  );
  
  if (!storage) return; // Extension context invalid
  
  console.log('[Twitter Wrapped] Extension storage:', storage);
  
  // Save to localStorage for web app
  if (storage.user) {
    localStorage.setItem('tw_user', JSON.stringify(storage.user));
  }
  if (storage.twitterUsername) {
    localStorage.setItem('tw_username', storage.twitterUsername);
  }
  if (storage.lastSync) {
    localStorage.setItem('tw_lastSync', storage.lastSync);
  }
  if (storage.latestStats) {
    localStorage.setItem('tw_latestStats', JSON.stringify(storage.latestStats));
  }
  if (storage.stats) {
    localStorage.setItem('tw_stats', JSON.stringify(storage.stats));
  }
  
  // Dispatch event so web app knows data is ready
  window.dispatchEvent(new CustomEvent('extensionDataReady', { detail: storage }));
  
  console.log('[Twitter Wrapped] Data synced to localStorage');
}

// Bidirectional sync function
function performSync() {
  if (!extensionValid) return; // Skip if extension context is invalid
  
  try {
    // Check localStorage for user data (could be set by Firebase auth)
    const localUserStr = localStorage.getItem('tw_user');
    const localUser = localUserStr ? JSON.parse(localUserStr) : null;
    const localUsername = localStorage.getItem('tw_username');
    
    if (localUser && localUser.uid) {
      // Website → Extension (Website is source of truth when logged in)
      safeChromeCall(() => {
        chrome.storage.local.get(['user', 'twitterUsername'], (result) => {
          if (chrome.runtime.lastError) return;

          // Only update if different to avoid loops
          const currentUserStr = result.user ? JSON.stringify(result.user) : '';
          const newUserStr = JSON.stringify(localUser);
          
          if (currentUserStr !== newUserStr || result.twitterUsername !== localUsername) {
            console.log('[Twitter Wrapped] Syncing localStorage → Extension');
            chrome.storage.local.set({ 
              user: localUser, 
              twitterUsername: localUsername || ''
            });
          }
        });
      });
    } else {
      // Extension → Website (Only if website has no user AND not recently logged out)
      if (recentlyLoggedOut) {
        safeChromeCall(() => {
          chrome.storage.local.get(['user'], (result) => {
            if (result.user) {
              console.log('[Twitter Wrapped] Enforcing logout on Extension');
              chrome.storage.local.clear();
            }
          });
        });
        return;
      }

      safeChromeCall(() => {
        chrome.storage.local.get(['user', 'twitterUsername', 'lastSync', 'latestStats', 'stats'], (result) => {
          if (chrome.runtime.lastError) return;
          
          if (result.user && result.user.uid) {
            console.log('[Twitter Wrapped] Found user in extension, syncing to website');
            localStorage.setItem('tw_user', JSON.stringify(result.user));
            if (result.twitterUsername) localStorage.setItem('tw_username', result.twitterUsername);
            if (result.lastSync) localStorage.setItem('tw_lastSync', result.lastSync);
            if (result.latestStats) localStorage.setItem('tw_latestStats', JSON.stringify(result.latestStats));
            if (result.stats) localStorage.setItem('tw_stats', JSON.stringify(result.stats));
            
            window.dispatchEvent(new Event('TWITTER_WRAPPED_AUTH_CHANGE'));
          }
        });
      });
    }
  } catch (e) {
    console.error('[Twitter Wrapped] Error during sync:', e);
  }
}

// Initial sync (with delay to ensure extension is ready)
setTimeout(() => {
  if (isExtensionValid()) {
    syncDataToWebApp();
    performSync();
  }
}, 100);

// Poll every 2 seconds (only if extension is still valid)
const syncInterval = setInterval(() => {
  if (!extensionValid) {
    clearInterval(syncInterval);
    console.log('[Twitter Wrapped] Stopping sync - extension context invalid');
    return;
  }
  performSync();
}, 2000);

// Listen for storage changes in localStorage (Website → Extension)
window.addEventListener('storage', (e) => {
  if (!extensionValid) return;
  
  if (e.key === 'tw_user') {
    if (!e.newValue) {
      recentlyLoggedOut = true;
      setTimeout(() => recentlyLoggedOut = false, 5000);
    }
    performSync();
  }
});

// Listen for messages from extension (Popup/Background)
try {
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'EXTENSION_LOGOUT') {
        console.log('[Twitter Wrapped] Received logout from extension');
        recentlyLoggedOut = true;
        setTimeout(() => recentlyLoggedOut = false, 5000);
        
        localStorage.removeItem('tw_user');
        localStorage.removeItem('tw_username');
        localStorage.removeItem('tw_lastSync');
        localStorage.removeItem('tw_latestStats');
        localStorage.removeItem('tw_stats');
        window.dispatchEvent(new Event('TWITTER_WRAPPED_AUTH_CHANGE'));
      }
    });
  }
} catch (e) {
  // Ignore if extension context already invalid
}

// Listen for changes in chrome.storage (Extension → Website)
try {
  if (chrome && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (!extensionValid) return;
      if (namespace === 'local') {
        performSync();
      }
    });
  }
} catch (e) {
  // Ignore listener registration errors if context is invalid
}
