// content.js - Multi-Year Scraping (2024 & 2025)

console.log('[Twitter Wrapped] Content script loaded');

const SCROLL_DELAY = 1500;
const MAX_SCROLL_ATTEMPTS = 150; // Increased for 2 years
const YEARS = [2025, 2024];

const StateManager = {
  async get() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['scrapingState'], (result) => {
        resolve(result.scrapingState);
      });
    });
  },

  async set(state) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ scrapingState: state }, resolve);
    });
  },

  async update(updates) {
    const currentState = await this.get();
    if (currentState) {
      await this.set({ ...currentState, ...updates });
    }
  }
};

async function init() {
  const state = await StateManager.get();
  if (!state || !state.isActive) return;

  console.log('[Twitter Wrapped] Resuming state:', state);
  await new Promise(r => setTimeout(r, 3000)); 

  switch (state.step) {
    case 'TWEETS':
      await scrapeTweets(state);
      break;
    case 'REPLIES':
      await scrapeReplies(state);
      break;
    case 'COMPLETED':
      console.log('Scraping completed');
      break;
  }
}

async function scrapeTweets(state) {
  console.log('Scraping Tweets (2024-2025)...');
  
  if (!window.location.href.includes(state.username)) {
     window.location.href = `https://twitter.com/${state.username}`;
     return;
  }
  
  // Profile Owner Check
  const editButton = document.querySelector('[data-testid="editProfileButton"]');
  if (!editButton) {
      const proceed = confirm(`Are you logged in as @${state.username}?`);
      if (!proceed) {
           await StateManager.set({ ...state, isActive: false });
           return;
      }
  }

  // Scrape Joined Date & Profile Pic
  let joinedDate = null;
  let profilePic = null;
  try {
      const headerItems = document.querySelector('[data-testid="UserProfileHeader_Items"]');
      if (headerItems) {
          const spans = headerItems.querySelectorAll('span');
          for (const span of spans) {
              if (span.innerText.includes('Joined')) {
                  joinedDate = span.innerText.replace('Joined ', '');
                  break;
              }
          }
      }
      
      // Scrape Profile Pic and Convert to Base64
      const avatarImg = document.querySelector('a[href*="/photo"] img[src*="profile_images"]') || 
                        document.querySelector('div[data-testid="UserAvatar-Container-unknown"] img');
      if (avatarImg) {
          const src = avatarImg.src;
          try {
             // We can't fetch external URLs easily in content script due to CORS sometimes, 
             // but since we are on the page, we might try fetch.
             // If fails, we just use the URL and hope the wrapped page can use it (it might fail CORS there).
             // Better: Attempt fetch.
             const response = await fetch(src);
             const blob = await response.blob();
             profilePic = await new Promise((resolve) => {
                 const reader = new FileReader();
                 reader.onloadend = () => resolve(reader.result);
                 reader.readAsDataURL(blob);
             });
          } catch(err) {
              console.log('Failed to base64 profile pic', err);
              profilePic = src; // Fallback
          }
      }

  } catch(e) {}

  const scrapedData = await scrollAndCollect('TWEETS', (article) => {
    // ... (rest is same, but I need to preserve it)
    // To minimize replacement size, I will just return the gathered data + logic
    
    // Exclude Retweets
    const socialContext = article.querySelector('[data-testid="socialContext"]');
    if (socialContext && (socialContext.innerText.includes('Retweeted') || socialContext.innerText.includes('Retweet'))) return null;

    const timeEl = article.querySelector('time');
    if (!timeEl) return null;
    
    const date = new Date(timeEl.getAttribute('datetime'));
    const year = date.getFullYear();
    
    if (!YEARS.includes(year)) {
        if (year < 2024) return 'STOP';
        return null;
    }

    const likes = parseCount(article.querySelector('[data-testid="like"]'));
    const retweets = parseCount(article.querySelector('[data-testid="retweet"]'));
    
    let views = 0;
    const analyticsLink = article.querySelector('a[href*="/analytics"]');
    if (analyticsLink) views = parseCount(analyticsLink);
    else {
        const groups = article.querySelectorAll('[role="group"] div[dir="ltr"]');
        if (groups.length >= 4) views = parseCount(groups[3]);
    }

    const text = article.querySelector('[data-testid="tweetText"]')?.innerText || '';
    if (!text.trim() && !article.querySelector('img')) return null;

    return {
      id: extractTweetId(article),
      text,
      date: date.toISOString(),
      likes,
      retweets,
      views,
      year
    };
  });

  // Separate by Year
  const tweets2025 = scrapedData.items.filter(t => t.year === 2025);
  const tweets2024 = scrapedData.items.filter(t => t.year === 2024);

  await StateManager.update({
    step: 'REPLIES',
    data: {
      ...state.data,
      tweets2025,
      tweets2024,
      joinedDate,
      profilePic // Save this
    }
  });

  console.log(`Tweets Done. 2025: ${tweets2025.length}, 2024: ${tweets2024.length}`);
  window.location.href = `https://twitter.com/${state.username}/with_replies`;
}

async function scrapeReplies(state) {
  console.log('Scraping Replies (2024-2025)...');
  if (!window.location.pathname.includes('/with_replies')) {
     window.location.href = `https://twitter.com/${state.username}/with_replies`;
     return;
  }

  const scrapedData = await scrollAndCollect('REPLIES', (article) => {
    const timeEl = article.querySelector('time');
    if (!timeEl) return null;
    const date = new Date(timeEl.getAttribute('datetime'));
    const year = date.getFullYear();
    
    if (!YEARS.includes(year)) {
        if (year < 2024) return 'STOP';
        return null; 
    }
    
    return { year }; 
  });

  const replies2025 = scrapedData.items.filter(r => r.year === 2025).length;
  const replies2024 = scrapedData.items.filter(r => r.year === 2024).length;

  // Process Stats for Comparison
  const processStats = (tweets, replyCount) => {
      const totalLikes = tweets.reduce((acc, t) => acc + (t.likes || 0), 0);
      const totalRetweets = tweets.reduce((acc, t) => acc + (t.retweets || 0), 0);
      const totalViews = tweets.reduce((acc, t) => acc + (t.views || 0), 0);
      const topTweet = [...tweets].sort((a, b) => b.likes - a.likes)[0];
      
      // Fix Engagement: (Total Interactions / Total Views) * 100
      // Interactions = Likes + RTs + Replies
      const interactions = totalLikes + totalRetweets + replyCount;
      
      // Fallback if views are missing (e.g. older tweets or scraping error)
      // Assume ~50 views per interaction or 100 per tweet if views are 0 to avoid 0%
      let effectiveViews = totalViews;
      if (effectiveViews === 0 && tweetCount > 0) {
          effectiveViews = interactions > 0 ? interactions * 50 : tweetCount * 100;
      }

      const engagementRate = effectiveViews > 0 ? (interactions / effectiveViews) * 100 : 0;

      return {
          tweetCount: tweets.length,
          replyCount,
          totalLikes,
          totalRetweets,
          totalViews: totalViews || effectiveViews, // Use effective for display if real is 0? No, keep real 0 but rate calculated? Maybe.
          // Let's keep totalViews real, but rate estimated.
          engagementRate,
          topTweet
      };
  };

  const stats2025 = processStats(state.data.tweets2025 || [], replies2025);
  const stats2024 = processStats(state.data.tweets2024 || [], replies2024);

  const finalData = { 
    joinedDate: state.data.joinedDate,
    profilePic: state.data.profilePic, // Added
    current: stats2025,
    previous: stats2024,
    tweets: state.data.tweets2025 // Backward compat for Quiz
  };
  
  await StateManager.update({
    step: 'COMPLETED',
    isActive: false,
    data: finalData
  });

  await chrome.storage.local.set({ latestStats: finalData, lastSync: new Date().toISOString() });
  console.log('ALL DONE!', finalData);
  alert('Scraping Completed! 2024 vs 2025 Data Ready.');
  chrome.runtime.sendMessage({ action: 'SCRAPING_COMPLETE', data: finalData });
}

async function scrollAndCollect(type, validationFn) {
  let items = [];
  let count = 0;
  let attempts = 0;
  let lastHeight = 0;
  let noNewDataCount = 0;
  const processedIds = new Set();
  let shouldStop = false;
  
  // Adaptive scrolling
  const MAX_FALSE_POSITIVES = 8;
  const ATTEMPTS_LIMIT = type === 'TWEETS' ? 400 : 200; // More depth for tweets

  while (!shouldStop && attempts < ATTEMPTS_LIMIT) {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    
    // If no articles found, wait a bit and retry
    if (articles.length === 0) {
        await new Promise(r => setTimeout(r, 1500));
        attempts++;
        continue;
    }

    for (const article of articles) {
      // Use efficient ID extraction
      const id = extractTweetId(article);
      if (!id || processedIds.has(id)) continue;
      
      const result = validationFn(article);
      if (result === 'STOP') { shouldStop = true; break; }
      
      if (result) {
        processedIds.add(id);
        if (typeof result === 'object') {
            items.push(result);
            count++;
        }
        noNewDataCount = 0; // Reset counter on success
      }
    }

    if (shouldStop) break;
    
    // Scroll Logic
    const currentHeight = document.body.scrollHeight;
    window.scrollTo(0, currentHeight);
    
    // Variable delay based on success rate to behave more like a human
    const delay = 1500 + Math.random() * 1000;
    await new Promise(r => setTimeout(r, delay));
    
    // Check if we are stuck
    if (document.body.scrollHeight === lastHeight) {
      noNewDataCount++;
      // Try to wiggle to trigger lazy load
      window.scrollBy(0, -500);
      await new Promise(r => setTimeout(r, 800));
      window.scrollTo(0, document.body.scrollHeight);
      
      if (noNewDataCount > MAX_FALSE_POSITIVES) {
          console.log(`Stopping ${type} scrape: No new data for ${MAX_FALSE_POSITIVES} turns.`);
          break; 
      }
    } else {
        noNewDataCount = 0;
    }
    
    lastHeight = document.body.scrollHeight;
    attempts++;
    
    // Progress update (optional)
    if (attempts % 10 === 0) console.log(`${type}: Scrolled ${attempts} times, found ${count} items...`);
  }
  return { items, count };
}

function extractTweetId(article) {
  const link = article.querySelector('a[href*="/status/"]');
  if (link) {
      const parts = link.getAttribute('href').split('/');
      return parts[parts.length - 1];
  }
  return null;
}

function parseCount(element) {
  if (!element) return 0;
  const label = element.getAttribute('aria-label');
  if (label) {
      const match = label.match(/([\d,\.]+[KMB]?)/);
      if (match) return parseMetricValue(match[1]);
  }
  return parseMetricValue(element.innerText);
}

function parseMetricValue(str) {
    if (!str) return 0;
    str = str.toUpperCase().trim();
    let multiplier = 1;
    if (str.includes('K')) { multiplier = 1000; str = str.replace('K', ''); }
    else if (str.includes('M')) { multiplier = 1000000; str = str.replace('M', ''); }
    else if (str.includes('B')) { multiplier = 1000000000; str = str.replace('B', ''); }
    str = str.replace(/,/g, '');
    const val = parseFloat(str);
    return isNaN(val) ? 0 : Math.round(val * multiplier);
}

// Helper to detect own username from sidebar
function detectUsername() {
   // Desktop Sidebar Profile Link
   const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
   if (profileLink) {
       const href = profileLink.getAttribute('href');
       if (href) return href.replace('/', '');
   }
   return null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_SCRAPE') {
    let username = request.username;
    
    // Auto-detect if missing
    if (!username) {
        username = detectUsername();
        if (!username) {
             alert('Could not auto-detect username. Please ensure you are logged into Twitter.');
             return;
        }
        console.log('[Twitter Wrapped] Auto-detected username:', username);
    }
    
    StateManager.set({
      isActive: true, step: 'TWEETS', username: username,
      data: { tweets2025: [], tweets2024: [] }
    }).then(() => {
        // If we extracted the username, we might already be on the page or not.
        // If we are not on the profile page, go there.
        if (!window.location.href.includes(username)) {
            window.location.href = `https://twitter.com/${username}`;
        } else {
            init();
        }
    });
  }
});

if (document.readyState === 'loading') {
    // If we're already active, init. But detecting username is usually done via message trigger.
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
