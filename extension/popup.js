// popup.js - Twitter Wrapped Extension
const WEB_APP_URL = "http://localhost:5173";

// DOM Elements
const loginSection = document.getElementById('login-section');
const loggedInSection = document.getElementById('logged-in-section');
const syncingSection = document.getElementById('syncing-section');
const successSection = document.getElementById('success-section');

const loginBtn = document.getElementById('login-btn');
const syncBtn = document.getElementById('sync-btn');
const logoutBtn = document.getElementById('logout-btn');
const viewWrappedBtn = document.getElementById('view-wrapped-btn');
const viewWrappedSuccessBtn = document.getElementById('view-wrapped-success-btn');

const userEmail = document.getElementById('user-email');
const twitterHandle = document.getElementById('twitter-handle');
const userAvatar = document.getElementById('user-avatar');
const lastSyncEl = document.getElementById('last-sync');
const syncingDetail = document.getElementById('syncing-detail');

// State
let currentUser = null;
let currentUsername = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthState();
  
  // Check if scraping is active
  const { scrapingState } = await chrome.storage.local.get(['scrapingState']);
  if (scrapingState && scrapingState.isActive) {
      showSyncingState(`Scraping in progress: ${scrapingState.step}...`);
      monitorProgress();
  }
});

// Check authentication state
async function checkAuthState() {
  try {
    const data = await chrome.storage.local.get(['user', 'twitterUsername', 'lastSync']);
    
    if (data.user && data.user.uid) {
      currentUser = data.user;
      currentUsername = data.twitterUsername;
      showLoggedInState(data);
    } else {
      showLoginState();
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    showLoginState();
  }
}

function showLoginState() {
  loginSection.classList.remove('hidden');
  loggedInSection.classList.add('hidden');
  syncingSection.classList.add('hidden');
  successSection.classList.add('hidden');
}

function showLoggedInState(data) {
  loginSection.classList.add('hidden');
  loggedInSection.classList.remove('hidden');
  syncingSection.classList.add('hidden');
  successSection.classList.add('hidden');
  
  if (data.user) {
    userEmail.textContent = data.user.email || 'User';
    userAvatar.textContent = (data.user.email || 'U').charAt(0).toUpperCase();
  }
  twitterHandle.textContent = data.twitterUsername ? `@${data.twitterUsername}` : 'Not set';
  
  if (data.lastSync) {
    const date = new Date(data.lastSync);
    lastSyncEl.textContent = `Last sync: ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    lastSyncEl.textContent = 'Last sync: Never';
  }
}

function showSyncingState(message = 'Starting scrape process...') {
  loginSection.classList.add('hidden');
  loggedInSection.classList.add('hidden');
  syncingSection.classList.remove('hidden');
  successSection.classList.add('hidden');
  syncingDetail.textContent = message;
}

function showSuccessState() {
  loginSection.classList.add('hidden');
  loggedInSection.classList.add('hidden');
  syncingSection.classList.add('hidden');
  successSection.classList.remove('hidden');
}

function showError(message) {
  alert(message);
  checkAuthState();
}

function monitorProgress() {
    const interval = setInterval(async () => {
        const { scrapingState } = await chrome.storage.local.get(['scrapingState']);
        if (!scrapingState || !scrapingState.isActive) {
            clearInterval(interval);
            // Check if successful
            if (scrapingState && scrapingState.data) {
                showSuccessState();
            } else {
                checkAuthState();
            }
        } else {
            syncingDetail.textContent = `Scraping: ${scrapingState.step} (${scrapingState.data.tweetCount || 0} tweets)...`;
        }
    }, 1000);
}

// Event Listeners
loginBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEB_APP_URL}/auth` });
});

syncBtn.addEventListener('click', async () => {
  if (!currentUsername) {
      showError('Please set your Twitter username in the web app first.');
      return;
  }
  
  console.log('Sync button clicked, target:', currentUsername);
  showSyncingState('Initializing scraping...');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
         // Open Twitter if not open
         const newTab = await chrome.tabs.create({ url: `https://twitter.com/${currentUsername}` });
         
         // Wait for load? The content script will handle START_SCRAPE but we need to send it after load.
         // Better: just set storage flag and let content script auto-start if we were able to inject it
         // But content script only runs on matches. 
         
         // Let's send message to the new tab after a delay?
         // Reliable way: Check chrome.runtime.lastError in a loop
         showError('Opened Twitter. Please click Sync again when the page loads.');
         return; 
    }
    
    // Send START_SCRAPE message
    chrome.tabs.sendMessage(tab.id, { 
        action: 'START_SCRAPE', 
        username: currentUsername 
    }, (response) => {
        if (chrome.runtime.lastError) {
             // Try injecting
             chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
             }).then(() => {
                 setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, { 
                        action: 'START_SCRAPE', 
                        username: currentUsername 
                    });
                    monitorProgress();
                 }, 500);
             });
        } else {
            monitorProgress();
        }
    });

  } catch (error) {
    console.error('Sync error:', error);
    showError('An error occurred. please try again.');
  }
});

logoutBtn.addEventListener('click', async () => {
  await chrome.storage.local.clear();
  currentUser = null;
  showLoginState();
});

viewWrappedBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEB_APP_URL}/dashboard` });
});

viewWrappedSuccessBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEB_APP_URL}/dashboard` });
});

// Use message listener for updates
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'SCRAPING_COMPLETE') {
        showSuccessState();
    }
});
