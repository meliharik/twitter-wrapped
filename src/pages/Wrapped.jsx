import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  Twitter, Repeat, TrendingUp, Eye, Share2, CheckCircle, 
  Heart, MessageCircle, Download, Sparkles, Zap, Clock, Calendar
} from 'lucide-react';
import './Wrapped.css';

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
  
  // Quiz
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const latestStatsStr = localStorage.getItem('tw_latestStats');
    if (latestStatsStr) {
      try {
        const fullData = JSON.parse(latestStatsStr);
        const currentStats = fullData.current || fullData;
        if (fullData.profilePic) currentStats.profilePic = fullData.profilePic;
        const previousStats = fullData.previous || null;
        
        setStats(currentStats);
        
        if (previousStats && previousStats.tweetCount > 0) {
            setComparison({
                tweets: ((currentStats.tweetCount - previousStats.tweetCount) / previousStats.tweetCount) * 100,
                views: ((currentStats.totalViews - previousStats.totalViews) / previousStats.totalViews) * 100,
            });
        }
      } catch (e) {
        console.error('Error parsing stats', e);
      }
    }
    setLoading(false);
  }, []);

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
     ];
     if (quizData) base.push({ id: 'quiz', title: 'Pop Quiz' });
     if (stats?.topTweet) base.push({ id: 'topTweet', title: 'MVP Tweet' });
     base.push({ id: 'summary', title: '2025 Recap' });
     return base;
  }, [quizData, stats]);

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
      if (id === quizData.winner.id) fireConfetti();
      setTimeout(() => changeSlide(1), 2000);
  };

    const generateShareImage = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080; canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      
      // Load fonts if possible (optional but good)
      // We rely on system fonts failing back nicely
      
      // --- Background ---
      // Deep elegant gradient
      const grd = ctx.createLinearGradient(0, 0, 1080, 1920);
      grd.addColorStop(0, "#000000");
      grd.addColorStop(0.4, "#05070a");
      grd.addColorStop(1, "#10161d");
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,1080,1920);
      
      // Abstract Ambient Glows
      const drawGlow = (x, y, r, color) => {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
          glow.addColorStop(0, color);
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.fillRect(x-r, y-r, r*2, r*2);
      };
      
      // Blue glow top left
      drawGlow(0, 0, 900, "rgba(29, 155, 240, 0.15)");
      // Purple/Pink glow bottom right
      drawGlow(1080, 1920, 800, "rgba(249, 24, 128, 0.1)");
      
      // Noise overlay (Simulated)
      // ctx.globalAlpha = 0.05;
      // ... (Skipping noise for performance/simplicity, clean look is premium too)
      
      // --- Header ---
      ctx.textAlign = 'center';
      
      // "TWITTER" small label
      ctx.fillStyle = '#1d9bf0';
      ctx.font = '700 30px Inter, -apple-system, sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('TWITTER ANALYTICS', 540, 120);

      // "WRAPPED" Big Title
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 130px Inter, -apple-system, sans-serif';
      ctx.shadowColor = "rgba(29, 155, 240, 0.5)";
      ctx.shadowBlur = 40;
      ctx.fillText('2025', 540, 250);
      ctx.shadowBlur = 0; // Reset
      
      // Subtitle
      ctx.fillStyle = '#8899a6'; // Twitter gray
      ctx.font = '500 40px Inter, -apple-system, sans-serif';
      ctx.fillText('YOUR YEAR IN REVIEW', 540, 320);

      // --- Grid Layout for Stats ---
      const drawStatBox = (label, value, change, x, y, width, accent) => {
          ctx.save();
          ctx.translate(x, y);
          
          // Glass Box
          ctx.beginPath();
          ctx.roundRect(0, 0, width, 280, 40);
          ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
          // Border gradient simulation
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fill();
          
          // Accent line
          if (accent) {
            ctx.beginPath();
            ctx.roundRect(40, 40, 8, 8, 4);
            ctx.fillStyle = accent;
            ctx.fill();
          }

          // Value
          ctx.textAlign = 'left';
          ctx.fillStyle = '#ffffff';
          ctx.font = '800 70px Inter, sans-serif';
          ctx.fillText(value, 40, 140);
          
          // Label
          ctx.fillStyle = '#8899a6';
          ctx.font = '500 30px Inter, sans-serif';
          ctx.fillText(label.toUpperCase(), 40, 190);
          
          // Comparison Pill
          if (change) {
              const isPos = change.includes('+');
              // Pill Bg
              ctx.beginPath();
              // Calculate width generally
              const pillW = ctx.measureText(change).width + 40;
              ctx.roundRect(40, 210, pillW, 44, 22);
              ctx.fillStyle = isPos ? "rgba(0, 186, 124, 0.15)" : "rgba(249, 24, 128, 0.15)";
              ctx.fill();
              
              ctx.fillStyle = isPos ? "#00ba7c" : "#f91880";
              ctx.font = "bold 24px Inter, sans-serif";
              ctx.fillText(change, 60, 241);
          }
          
          ctx.restore();
      };
      
      const viewsGrowth = comparison?.views ? (comparison.views>0?'+':'') + comparison.views.toFixed(0)+'%' : null;
      const tweetGrowth = comparison?.tweets ? (comparison.tweets>0?'+':'') + comparison.tweets.toFixed(0)+'%' : null;

      // Layout: 2x2 Grid
      // Row 1
      drawStatBox("Total Views", (stats.totalViews||0).toLocaleString(), viewsGrowth, 60, 400, 460, "#1d9bf0");
      drawStatBox("Twitter Age", `${aiAgeData.age} Years`, aiAgeData.title, 560, 400, 460, "#d1d5db"); // White/Gray accent
      
      // Row 2
      drawStatBox("Tweets Sent", (stats.tweetCount||0).toLocaleString(), tweetGrowth, 60, 720, 460, "#1d9bf0");
      drawStatBox("Engagement Impact", `${(stats.engagementRate||0).toFixed(1)}%`, "Interaction Rate", 560, 720, 460, "#f91880");

      // --- Top Tweet Section ---
      if (stats.topTweet) {
          const cardY = 1080;
          ctx.save();
          ctx.translate(60, cardY);
          
          // Section Title
          ctx.fillStyle = "#ffffff";
          ctx.font = "700 40px Inter";
          ctx.textAlign = "left";
          ctx.fillText("MOST LOVED TWEET", 10, -30);
          
          // Tweet Card
          ctx.beginPath();
          ctx.roundRect(0, 0, 960, 700, 50);
          ctx.fillStyle = "#000000";
          ctx.fill();
          ctx.strokeStyle = "rgba(47, 51, 54, 1.0)"; // Twitter border color
          ctx.lineWidth = 3;
          ctx.stroke();
          
          // User PFP
          const pfpX = 50;
          const pfpY = 50;
          ctx.save();
          ctx.beginPath();
          ctx.arc(pfpX+50, pfpY+50, 50, 0, Math.PI*2);
          ctx.clip();
          
          if (stats.profilePic) {
            try {
                const img = new Image();
                img.src = stats.profilePic;
                await new Promise(r => { 
                    img.onload = r; 
                    img.onerror = () => {  // Fallback if failed (CORS)
                        ctx.fillStyle = "#333"; ctx.fill(); 
                        r();
                    };
                    // Set timeout for image load
                    setTimeout(r, 2000);
                });
                if (img.complete && img.naturalHeight !== 0) {
                     ctx.drawImage(img, pfpX, pfpY, 100, 100);
                } else { throw new Error('Img load fail'); }
            } catch(e) {
                 ctx.fillStyle = "#333"; ctx.fill();
            }
          } else {
             ctx.fillStyle = "#333"; ctx.fill();
          }
          ctx.restore();
          
          // User Names
          ctx.textAlign = 'left';
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 45px Inter, sans-serif';
          ctx.fillText(userData?.displayName || 'Twitter User', 180, 100);
          
          ctx.fillStyle = '#71767b';
          ctx.font = '400 38px Inter, sans-serif';
          ctx.fillText(`@${userData?.twitterUsername || 'user'}`, 180, 150);
          
          // Text Content
          ctx.fillStyle = '#e7e9ea'; // Twitter Text Color
          ctx.font = '400 55px Inter, sans-serif'; // Bigger font
          const maxWidth = 860;
          const words = stats.topTweet.text.split(' ');
          let line = '';
          let ty = 260; // Start Y
          
          for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
              ctx.fillText(line, 50, ty);
              line = words[n] + ' ';
              ty += 70; // Line height
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, 50, ty);
          
          // Metrics Line (Bottom of card)
          const my = 620; // Metrics Y
          const metricGap = 200;
          
          // Likes
          ctx.fillStyle = '#f91880'; // Pink
          ctx.font = '700 40px Inter';
          ctx.fillText(`♥ ${stats.topTweet.likes.toLocaleString()}`, 50, my);
          
          // RTs
          ctx.fillStyle = '#00ba7c'; // Green
          ctx.fillText(`⇄ ${stats.topTweet.retweets?.toLocaleString() || 0}`, 50 + metricGap + 20, my);
          
          // Views
          ctx.fillStyle = '#1d9bf0'; // Blue
          ctx.fillText(`Last Views: ${(stats.topTweet.views || 0).toLocaleString()}`, 50 + (metricGap*2) + 20, my);

          ctx.restore();
      }

      // --- Footer ---
      ctx.textAlign = 'center';
      ctx.fillStyle = '#333';
      ctx.font = '600 30px Inter, monospace';
      ctx.fillText('GENERATED BY TWITTER ANALYTICS APP', 540, 1880);

      // Download
      try {
          const url = canvas.toDataURL('image/png', 1.0);
          const link = document.createElement('a');
          link.download = `twitter-wrapped-2025-${userData?.twitterUsername}.png`;
          link.href = url;
          link.click();
      } catch(e) { console.error(e); alert("Failed to generate image."); }
  };

  const shareToTwitter = () => {
    const text = `Dropped my 2025 Wrapped. I'm ${aiAgeData.age} Twitter Years old. 🚀
    
Check yours at built-by-melih.app

#TwitterWrapped2025`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
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
                   <div className="slide-header"><h2>Impact</h2><p>Did you make an impact?</p></div>
                   <div className="metrics-card">
                       <div className="metric-icon"><TrendingUp size={64}/></div>
                       <div className="metric-value">{(stats.engagementRate||0).toFixed(1)}%</div>
                       <div className="metric-label">Global Engagement</div>
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
              <div className="slide-layout summary-layout">
                  <div className="summary-grid">
                      <div className="summary-card"><div className="sc-header"><Eye size={16}/> Views</div><div className="sc-value">{(stats.totalViews||0).toLocaleString()}</div></div>
                      <div className="summary-card"><div className="sc-header"><Zap size={16}/> AI Age</div><div className="sc-value">{aiAgeData.age}</div></div>
                      <div className="summary-card"><div className="sc-header"><Clock size={16}/> Hours</div><div className="sc-value">{timeSpent}</div></div>
                      <div className="summary-card"><div className="sc-header"><TrendingUp size={16}/> Impact</div><div className="sc-value">{(stats.engagementRate||0).toFixed(1)}%</div></div>
                  </div>
                  <div className="action-row">
                      <button onClick={generateShareImage} className="btn-primary" style={{background:'#fff',color:'#000',fontWeight:700}}><Download size={18}/> Save Card</button>
                      <button onClick={shareToTwitter} className="btn-secondary" style={{background:'#1d9bf0',color:'#fff',fontWeight:700}}><Share2 size={18}/> Share on X</button>
                  </div>
                  <button onClick={()=>navigate('/dashboard')} className="btn-text">Dashboard</button>
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
    </div>
  );
};

export default Wrapped;
