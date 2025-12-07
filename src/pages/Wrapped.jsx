import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Twitter, Repeat, TrendingUp, Eye, Share2, CheckCircle,
  Heart, MessageCircle, Download, Sparkles, Zap, Clock, Calendar
} from 'lucide-react';
import './Wrapped.css';

/* Themes Configuration */
const THEMES = {
   midnight: { bg1: '#000000', bg2: '#15202B', accent: '#1D9BF0', text: '#FFFFFF', card: '#192734' },
   sunset:   { bg1: '#410B24', bg2: '#0F0518', accent: '#F91880', text: '#FFFFFF', card: '#2D1020' },
   ocean:    { bg1: '#051923', bg2: '#003554', accent: '#00A6FB', text: '#FFFFFF', card: '#0582CA' },
   forest:   { bg1: '#0D1F12', bg2: '#050F08', accent: '#00BA7C', text: '#FFFFFF', card: '#122D1A' },
};

// Hook for counting up numbers
const useCountUp = (end, duration = 2000) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime;
    let animationFrame;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) animationFrame = window.requestAnimationFrame(step);
    };
    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  return count;
};

// Sub-components to prevent hook violations
const ViewsSlide = ({ stats, comparison }) => {
    const count = useCountUp(stats.totalViews || 0);
    return (
      <div className="slide-layout">
          <div className="slide-header"><h2>Viral Moment</h2><p>You really put yourself out there.</p></div>
          <div className="metrics-card">
              <div className="metric-icon"><Eye size={64}/></div>
              <div className="metric-value">{count.toLocaleString()}</div>
              {comparison?.views && (
                  <div className={`metric-sub ${comparison.views>=0?'pos':'neg'}`}>
                      {comparison.views>0?'+':''}{comparison.views.toFixed(0)}% Growth
                  </div>
              )}
          </div>
      </div>
    );
};

const Wrapped = () => {
  const { userData } = useAuth();
  const [stats, setStats] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [theme, setTheme] = useState('midnight');
  const [previewUrl, setPreviewUrl] = useState(null);

  // Quiz
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);

  const navigate = useNavigate();

      // Load Data
      useEffect(() => {
         const local = localStorage.getItem('tw_latestStats');
         if(local) {
             try {
                processData(JSON.parse(local));
             } catch(e) { console.error(e); }
         }

         const handleData = (e) => {
             if (e.detail?.latestStats) processData(e.detail.latestStats);
         };
         window.addEventListener('extensionDataReady', handleData);

         setLoading(false);
         return () => window.removeEventListener('extensionDataReady', handleData);
      }, []);

      const processData = (fullData) => {
         const currentStats = fullData.current || fullData;
         // Ensure top level props are preserved
         if (fullData.profilePic) currentStats.profilePic = fullData.profilePic;
         if (fullData.username) currentStats.username = fullData.username;
         if (fullData.displayName) currentStats.displayName = fullData.displayName;

         const previousStats = fullData.previous || null;

         setStats(currentStats);
         if (fullData.tweets) currentStats.tweets = fullData.tweets; // Explicitly attach raw tweets for Quiz
         
         if (previousStats && previousStats.tweetCount > 0) {
            setComparison({
                tweets: ((currentStats.tweetCount - previousStats.tweetCount) / previousStats.tweetCount) * 100,
                views: ((currentStats.totalViews - previousStats.totalViews) / previousStats.totalViews) * 100,
                interactions: ((
                    ((currentStats.totalLikes || 0) + (currentStats.totalRetweets || 0) + (currentStats.replyCount || 0)) -
                    ((previousStats.totalLikes || 0) + (previousStats.totalRetweets || 0) + (previousStats.replyCount || 0))
                ) / ((previousStats.totalLikes || 0) + (previousStats.totalRetweets || 0) + (previousStats.replyCount || 0))) * 100
            });
         }
      };

    // Update Preview when stats or theme changes
    useEffect(() => {
        if(stats && currentSlide === slides.length - 1) {
            // Wait slightly for canvas contexts
            setTimeout(() => generateShareImage(true).then(url => setPreviewUrl(url)), 100);
        }
    }, [stats, theme, currentSlide]);

  // AI Age Logic
  const aiAgeData = useMemo(() => {
      if (!stats) return { age: 25, title: "Mystery" };
      const dailyTweets = stats.tweetCount / 365;

      let age = 30;
      let title = "The Balanced One";
      let desc = "You touch grass occasionally.";

      if (dailyTweets > 3.0) {
          age = 18;
          title = "Terminal Online";
          desc = "Do you ever sleep? Respect.";
      } else if (dailyTweets > 1.0) {
          age = 22;
          title = "The Main Character";
          desc = "Daily tweeter. The timeline needs you.";
      } else if (dailyTweets > 0.5) {
          age = 28;
          title = "Digital Native";
          desc = "Solid presence. Quality poster.";
      } else if (dailyTweets > 0.1) {
          age = 45;
          title = "The Observer";
          desc = "You speak only when necessary. Wise.";
      } else {
          age = 65;
          title = "The Lurker";
          desc = "Silent but watching. Menacing.";
      }
      return { age, title, desc };
  }, [stats]);

  const timeSpent = useMemo(() => {
      if (!stats) return 0;
      const hours = Math.round(((stats.tweetCount * 5) + (stats.totalViews * 0.05)) / 60);
      return hours;
  }, [stats]);

  const fireConfetti = useCallback(() => {
    const colors = ['#1d9bf0', '#f91880', '#00ba7c', '#ffffff'];
    const container = document.querySelector('.wrapped-app');
    if (!container) return;
    for(let i=0; i<60; i++) {
        const el = document.createElement('div');
        el.className = 'confetti';
        el.style.left = Math.random() * 100 + 'vw';
        el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDuration = (Math.random() * 2 + 1) + 's';
        container.appendChild(el);
        setTimeout(() => el.remove(), 3500);
    }
  }, []);

  useEffect(() => {
      if (stats && slides[currentSlide]?.id === 'summary') setTimeout(fireConfetti, 200);
  }, [currentSlide, stats, fireConfetti]);

  const quizData = useMemo(() => {
    if (!stats || !stats.tweets || stats.tweets.length === 0) return null;
    let sorted = [...stats.tweets].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    const winner = sorted[0];
    let distractors = sorted.slice(1, 4);
    if (distractors.length < 3) {
        const filler = { id: 'dummy', text: 'Classic banger tweet...', likes: 0 };
        while(distractors.length < 3) distractors.push(filler);
    }
    const options = [winner, ...distractors].sort(() => Math.random() - 0.5);
    return { winner, options };
  }, [stats]);

  const slides = useMemo(() => {
     if (!stats) return [];
     const base = [
      { id: 'views', title: 'Viral Moment' },
      { id: 'timer', title: 'Lost Time' },
      { id: 'age', title: 'Twitter Age' },
      { id: 'engagement', title: 'Impact' },
      { id: 'quiz', title: 'Pop Quiz' },
     ];
     if (stats?.topTweet) base.push({ id: 'topTweet', title: 'MVP Tweet' });
     base.push({ id: 'summary', title: '2025 Recap' });
     return base;
  }, [stats]);

  useEffect(() => {
    if (showIntro) {
      const t = setTimeout(() => setShowIntro(false), 3800);
      return () => clearTimeout(t);
    }
  }, [showIntro]);

  const changeSlide = (dir) => {
      const next = currentSlide + dir;
      if (next >= 0 && next < slides.length) setCurrentSlide(next);
  };

  const handleQuizSelect = (id) => {
      if (quizAnswered) return;
      setSelectedQuizId(id);
      setQuizAnswered(true);
      if (id === quizData?.winner.id) fireConfetti();
      setTimeout(() => changeSlide(1), 2000);
  };

    // --- Improved Stats Calculation ---
    const engagementScore = useMemo(() => {
        if (!stats) return 0;
        const interactions = (stats.totalLikes || 0) + (stats.totalRetweets || 0) + (stats.replyCount || 0);
        return interactions; // Display Total Interactions instead of Rate
    }, [stats]);


    const generateShareImage = async (returnUrl = false) => {
      const canvas = document.createElement('canvas');
      const cw = 1080;
      const ch = 1920;
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');

      const colors = THEMES[theme];

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, colors.bg1);
      grad.addColorStop(1, colors.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);

      // Abstract Glows
      const drawGlow = (x, y, r, color) => {
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, color + '40'); // 25% opacity
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI*2);
          ctx.fill();
      };

      drawGlow(cw, 0, 800, colors.accent);
      drawGlow(0, ch, 600, colors.accent);

      // Title
      ctx.fillStyle = colors.text;
      ctx.font = '900 120px "Inter", sans-serif'; // Bold Inter
      ctx.textAlign = 'center';
      ctx.fillText('2025', cw / 2, 200);

      ctx.font = '700 40px "Inter", sans-serif';
      ctx.letterSpacing = '5px';
      ctx.fillStyle = colors.accent;
      ctx.fillText('TWITTER WRAPPED', cw / 2, 260);

      ctx.font = '400 30px "Inter", sans-serif';
      ctx.fillStyle = '#8899a6';
      ctx.fillText('@' + (userData?.twitterUsername || stats.username || 'user'), cw/2, 310);
      ctx.letterSpacing = '0px';

      // Stat Grid - Glassmorphism
      const drawCard = (x, y, w, h, title, val) => {
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 24);
          ctx.fill();
          ctx.stroke();

          // Value
          ctx.fillStyle = colors.text;
          ctx.textAlign = 'left';
          // Auto-size value text
          const fitText = (text, maxWidth, initialSize) => {
             ctx.font = `700 ${initialSize}px "Inter", sans-serif`;
             let width = ctx.measureText(text).width;
             let size = initialSize;
             while (width > maxWidth && size > 20) {
                 size -= 5;
                 ctx.font = `700 ${size}px "Inter", sans-serif`;
                 width = ctx.measureText(text).width;
             }
             return `700 ${size}px "Inter", sans-serif`;
          };
          ctx.font = fitText(val, w - 60, 60);
          ctx.fillText(val, x + 30, y + 80);

          // Title
          ctx.fillStyle = '#8899a6';
          ctx.font = '600 24px "Inter", sans-serif';
          ctx.fillText(title, x + 30, y + 120);
          ctx.restore();
      };
      // ... (Cards Rendering Logic)
      const cardW = 460;
      const cardH = 220;
      const gap = 40;
      const startY = 400;

      drawCard(60, startY, cardW, cardH, 'TOTAL VIEWS', (stats.totalViews||0).toLocaleString());
      drawCard(60 + cardW + gap, startY, cardW, cardH, 'TWEETS SENT', (stats.tweetCount||0).toLocaleString());
      const interactions = (stats.totalLikes||0) + (stats.totalRetweets||0) + (stats.replyCount||0);
      drawCard(60, startY + cardH + gap, cardW, cardH, 'INTERACTIONS', interactions.toLocaleString());
      drawCard(60 + cardW + gap, startY + cardH + gap, cardW, cardH, 'TWITTER AGE', aiAgeData.age || 'Unknown');

      // Top Tweet Frame
      if (stats.topTweet) {
          const px = 60;
          const py = startY + (cardH * 2) + (gap * 2) + 40;
          const pW = cw - 120;

          // Measure Text for Dynamic Height
           ctx.font = '400 50px "Inter", sans-serif';
           const maxTextW = pW - 80;
           const words = stats.topTweet.text.split(' ');
           let lines = [];
           let currentLine = words[0];
           for (let i = 1; i < words.length; i++) {
               const word = words[i];
               const width = ctx.measureText(currentLine + " " + word).width;
               if (width < maxTextW) {
                   currentLine += " " + word;
               } else {
                   lines.push(currentLine);
                   currentLine = word;
               }
           }
           lines.push(currentLine);
               if(lines.length > 6) { // Reduced max lines for better spacing
              lines = lines.slice(0, 6);
              lines[5] += '...';
           }

           const lineHeight = 75; // Increased line height
           const textBlockHeight = lines.length * lineHeight;
           const headerHeight = 140;
           const footerHeight = 120;
           const padding = 80;
           const dynamicH = headerHeight + textBlockHeight + footerHeight + padding;

           // Ensure it fits within canvas
           const maxY = ch - 200;
           const maxH = maxY - py;

           // Draw Container
           ctx.save();
          ctx.fillStyle = colors.card === '#000000' ? '#111' : colors.card;
          if(theme !== 'midnight') ctx.fillStyle = 'rgba(0,0,0,0.6)';

          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(px, py, pW, dynamicH, 32);
          ctx.fill();
          ctx.stroke();

          // PFP
          const pfpSize = 80;
          const drawPfp = () => {
             ctx.save();
             ctx.beginPath();
             ctx.arc(px + 40 + pfpSize/2, py + 40 + pfpSize/2, pfpSize/2, 0, Math.PI*2);
             ctx.closePath();
             ctx.clip();
             if (document.getElementById('pfp-cache')) {
                ctx.drawImage(document.getElementById('pfp-cache'), px + 40, py + 40, pfpSize, pfpSize);
             } else {
                ctx.fillStyle = '#333';
                ctx.fillRect(px+40, py+40, pfpSize, pfpSize);
             }
             ctx.restore();
          };
          drawPfp();

          // Names
          ctx.textAlign = 'left';
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 40px "Inter", sans-serif';
          ctx.fillText(stats.displayName || userData?.displayName || 'Twitter User', px + pfpSize + 60, py + 85);
          ctx.fillStyle = '#8899a6';
          ctx.font = '400 34px "Inter", sans-serif';
          ctx.fillText(`@${stats.username || userData?.twitterUsername || 'user'}`, px + pfpSize + 60, py + 130);

          // Content
          ctx.fillStyle = '#ffffff';
          ctx.font = '400 50px "Inter", sans-serif';
          let textY = py + headerHeight + 50;
          lines.forEach(line => {
             ctx.fillText(line, px + 40, textY);
             textY += lineHeight;
          });

          // Metrics
          const my = py + dynamicH - 40;
          const ox = px + 40;
          const gapM = 200;
          const drawM = (icon, val, color, x) => {
               ctx.fillStyle = color;
               ctx.font = '700 36px "Inter", sans-serif';
               ctx.fillText(icon, x, my);
               ctx.fillStyle = '#888';
               ctx.font = '500 36px "Inter", sans-serif';
               ctx.fillText(val, x + 45, my);
          };
          drawM('♥', stats.topTweet.likes.toLocaleString(), '#F91880', ox);
          drawM('⇄', (stats.topTweet.retweets||0).toLocaleString(), '#00BA7C', ox + gapM);

          const vx = ox + gapM*2;
          ctx.fillStyle = '#1D9BF0';
          ctx.fillRect(vx, my - 25, 6, 25);
          ctx.fillRect(vx + 10, my - 35, 6, 35);
          ctx.fillRect(vx + 20, my - 15, 6, 15);
          ctx.fillStyle = '#888';
          ctx.font = '500 36px "Inter", sans-serif';
          ctx.fillText((stats.topTweet.views||0).toLocaleString(), vx + 45, my);
          ctx.restore();
      }

      // Branding
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '500 24px "Inter", sans-serif';
      ctx.fillText('built-by-melih.app', cw/2, ch - 50);

      if (returnUrl) {
          return canvas.toDataURL('image/png');
      }

      // Download
      const link = document.createElement('a');
      link.download = `twitter-wrapped-2025.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
  };

  const shareToTwitter = async () => {
    const text = `Dropped my 2025 Wrapped. I'm ${aiAgeData.age} Twitter Years old. 🚀\n\nCheck yours at built-by-melih.app\n\n#TwitterWrapped2025`;

    // Attempt native share first (Mobile)
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'My 2025 Twitter Wrapped',
                text: text,
                url: 'https://built-by-melih.app', // Or the direct image URL if generated as a blob
            });
            return; // If native share successful, stop here
        } catch (error) {
            console.error('Error sharing via navigator.share:', error);
            // Fallback to Twitter intent if native share fails or is cancelled
        }
    }

    // Default flow: Text + Link via Twitter Web Intent
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');

    // Show toast hint
    alert("Image downloaded! Attach it to your tweet.");
  };

  if (loading) return <div className="wrapped-loading"><div className="loading-dots"><div className="dot"></div></div></div>;

  if (showIntro) {
    return (
      <div className="wrapped-intro">
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "circOut" }}
            className="intro-content"
        >
            <Sparkles size={100} className="intro-icon-anim" style={{color:'#1d9bf0'}} />
            <h1 className="intro-title">2025 REWIND</h1>
            <p className="intro-subtitle">Is it over already?</p>
        </motion.div>
      </div>
    );
  }

  const slide = slides[currentSlide];

  const renderContent = () => {
      switch(slide.id) {
          case 'views': return <ViewsSlide stats={stats} comparison={comparison} />;
          case 'timer': return (
              <div className="slide-layout">
                  <div className="slide-header"><h2>Lost Time</h2><p>Time you'll never get back.</p></div>
                  <div className="metrics-card">
                      <div className="metric-icon"><Clock size={64}/></div>
                      <div className="metric-value">{timeSpent}</div>
                      <div className="metric-label">Estimated Hours on X</div>
                  </div>
              </div>
          );
          case 'age': return (
              <div className="slide-layout">
                  <div className="slide-header"><h2>Twitter Age</h2><p>{aiAgeData.desc}</p></div>
                  <div className="metrics-card">
                      <div className="metric-icon"><Calendar size={64}/></div>
                      <div className="metric-value">{aiAgeData.age}</div>
                      <div className="metric-label">"Twitter Years" Old</div>
                      <div className="metric-sub-text">{aiAgeData.title}</div>
                  </div>
              </div>
          );
          case 'engagement': return (
              <div className="slide-layout">
                   <div className="slide-header"><h2>Community</h2><p>People love you.</p></div>
                   <div className="metrics-card">
                       <div className="metric-icon"><TrendingUp size={64}/></div>
                       <div className="metric-value">{engagementScore.toLocaleString()}</div>
                       <div className="metric-label">Total Interactions</div>
                       <div className="metric-sub-text">Likes, Reposts & Replies</div>
                       {comparison?.interactions && (
                           <div className={`metric-sub ${comparison.interactions>=0?'pos':'neg'}`} style={{marginTop:'12px'}}>
                               {comparison.interactions>0?'+':''}{comparison.interactions.toFixed(0)}% vs 2024
                           </div>
                       )}
                   </div>
              </div>
          );
          case 'quiz': return (
              <div className="slide-layout">
                  <div className="slide-header"><h2>Pop Quiz</h2><p>Which tweet did numbers?</p></div>
                  <div className="quiz-grid">
                      {quizData?.options.map(t => (
                          <motion.button key={t.id}
                              className={`quiz-btn ${quizAnswered ? (t.id === quizData.winner.id ? 'correct' : (selectedQuizId === t.id ? 'wrong' : 'dimmed')) : ''}`}
                              onClick={() => handleQuizSelect(t.id)}
                              style={{minHeight:'80px'}}
                          >
                              <span className="truncate-text">{t.text || 'Media Tweet'}</span>
                              {quizAnswered && t.id === quizData.winner.id && <CheckCircle className="text-green-500"/>}
                          </motion.button>
                      ))}
                  </div>
              </div>
          );
          case 'topTweet': return (
              <div className="slide-layout">
                  <div className="slide-header"><h2>{slide.title}</h2><p>Your absolute banger.</p></div>
                  <div className="tweet-card">
                      <div className="tweet-body">"{stats.topTweet?.text}"</div>
                      <div className="tweet-footer">
                          <span><Heart size={16}/> {stats.topTweet?.likes}</span>
                          <span><Repeat size={16}/> {stats.topTweet?.retweets}</span>
                      </div>
                  </div>
              </div>
          );
          case 'summary': return (
              <div className="summary-slide" style={{height:'100%', overflowY:'auto', paddingTop:'80px', paddingBottom:'100px'}}>
                  <h2>Your 2025 Summary</h2>
                  <p>Choose a style & Share</p>

                  {/* Theme Selector */}
                  <div className="theme-selector" style={{display:'flex', gap:'12px', justifyContent:'center', margin:'20px 0'}}>
                      {Object.keys(THEMES).map(t => (
                          <button key={t}
                                  onClick={() => setTheme(t)}
                                  className={`theme-btn ${theme === t ? 'active' : ''}`}
                                  style={{
                                      width:40, height:40, borderRadius:'50%',
                                      background: `linear-gradient(45deg, ${THEMES[t].bg1}, ${THEMES[t].bg2})`,
                                      border: theme === t ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                                      cursor:'pointer'
                                  }}
                          />
                      ))}
                  </div>

                  {/* Preview Image */}
                  <div className="preview-container" style={{display:'flex', justifyContent:'center', marginBottom:'20px'}}>
                      {previewUrl ? (
                          <img src={previewUrl} alt="Preview" style={{
                              width:'300px', height:'auto', borderRadius:'16px',
                              boxShadow:'0 10px 40px rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.1)'
                          }}/>
                      ) : <div style={{width:300, height:500, background:'#111', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center'}}>Loading Preview...</div>}
                  </div>

                  <div className="action-buttons" style={{display:'flex', gap:'10px', justifyContent:'center'}}>
                      <motion.button className="share-btn" onClick={() => generateShareImage(false)}
                          whileHover={{scale:1.05}} whileTap={{scale:0.95}} style={{background:'white', color:'black', padding:'12px 24px', borderRadius:'24px', border:'none', fontWeight:'bold', display:'flex', alignItems:'center', gap:'8px'}}>
                          <Download size={20}/> Download Image
                      </motion.button>
                      <motion.button className="share-btn twitter" onClick={shareToTwitter}
                          whileHover={{scale:1.05}} whileTap={{scale:0.95}} style={{background:'#1D9BF0', color:'white', padding:'12px 24px', borderRadius:'24px', border:'none', fontWeight:'bold', display:'flex', alignItems:'center', gap:'8px'}}>
                          <Twitter size={20}/> Share Link
                      </motion.button>
                  </div>

                  <button onClick={()=>navigate('/dashboard')} style={{background:'transparent', border:'none', color:'#666', marginTop:'20px', textDecoration:'underline', cursor:'pointer'}}>Back to Dashboard</button>
              </div>
          );
          default: return null;
      }
  };
  return (
    <div className="wrapped-app">
       <div className="wrapped-background-anim"></div>
       <div className="progress-track" style={{ '--progress': `${((currentSlide) / (slides.length - 1)) * 100}%` }}><div className="progress-fill"></div></div>

       <div className="main-content">
           <AnimatePresence mode="wait">
             <motion.div
                key={currentSlide}
                className="slide-container"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.5, ease: "backOut" }}
             >
                {renderContent()}
             </motion.div>
           </AnimatePresence>
       </div>

       <div className="navigation-footer">
          <button className="nav-btn" onClick={()=>changeSlide(-1)} disabled={currentSlide === 0}>Back</button>
          <div className="slide-indicator">{currentSlide + 1} / {slides.length}</div>
          <button className="nav-btn primary" onClick={()=>changeSlide(1)} disabled={currentSlide === slides.length - 1} style={{background:'white',color:'black',fontWeight:'bold'}}>Next</button>
       </div>

       {/* PFP Cache for Canvas */}
       {stats?.profilePic && (
           <img id="pfp-cache" src={stats.profilePic} 
                crossOrigin="anonymous" referrerPolicy="no-referrer"
                style={{display:'none'}} alt="cache"
           />
       )}
    </div>
  );
};

export default Wrapped;
