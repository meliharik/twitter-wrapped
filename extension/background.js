// background.js - Service Worker

console.log('Twitter Wrapped: Background service worker started');

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received:', message);
  
  if (message.type === 'AUTH_UPDATE') {
    // Forward to popup if open
    sendResponse({ received: true });
  }
  
  return true;
});

// Handle extension install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed!');
  }
});
