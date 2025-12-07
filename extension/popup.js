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
  // If no username, we will try to auto-detect it in content script
  const targetUsername = currentUsername || null;
  
  console.log('Sync button clicked, target:', targetUsername);
  showSyncingState('Initializing... (Auto-detecting user)');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // If we're not on Twitter, open it
    const isTwitter = tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'));
    
    if (!isTwitter) {
         // If we don't know the username, just go to home
         const url = targetUsername ? `https://twitter.com/${targetUsername}` : 'https://twitter.com/home';
         const newTab = await chrome.tabs.create({ url });
         
         // In a real scenario, we can't easily wait for load here without background script help or simple delay
         showError('Opened Twitter. Please wait for it to load, then click Sync again.');
         return; 
    }
    
    // Send START_SCRAPE message
    const message = { 
        action: 'START_SCRAPE', 
        username: targetUsername 
    };
    
    chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
             // Inject if needed
             chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
             }).then(() => {
                 setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, message);
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
