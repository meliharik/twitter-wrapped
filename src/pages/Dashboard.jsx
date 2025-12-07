import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  Twitter, 
  Repeat, 
  TrendingUp, 
  Eye,
  MessageCircle,
  Sparkles,
  Download,
  LogOut,
  RefreshCw,
  ArrowRight,
  Play,
  ArrowUp,
  ArrowDown,
  Heart
} from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';
import StatCard from '../components/StatCard';
import './Dashboard.css';

const Dashboard = () => {
  const { user, userData, loading: authLoading, updateUserData } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wrappedViewed, setWrappedViewed] = useState(false);
  
  const navigate = useNavigate();

  const loadStatsFromExtension = useCallback(() => {
    const latestStatsStr = localStorage.getItem('tw_latestStats');
    const viewed = localStorage.getItem('tw_wrapped_viewed') === 'true';
    setWrappedViewed(viewed);

    if (latestStatsStr) {
      try {
        const parsed = JSON.parse(latestStatsStr);
        const current = parsed.current || parsed;
        if (parsed.profilePic) current.profilePic = parsed.profilePic;
        setStats(current); 
      } catch (e) {
        console.error('Error parsing stats:', e);
      }
    }
    return false;
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    // Removed username modal check logic
    loadStatsFromExtension();
    window.postMessage({ type: 'REQUEST_EXTENSION_DATA' }, '*');
    const handleExtensionData = (event) => {
      if (event.detail?.latestStats) {
        const data = event.detail.latestStats;
        const current = data.current || data;
        if (data.profilePic) current.profilePic = data.profilePic;
        setStats(current);
      }
    };
    window.addEventListener('extensionDataReady', handleExtensionData);
    setTimeout(() => setLoading(false), 500);
    return () => window.removeEventListener('extensionDataReady', handleExtensionData);
  }, [user, authLoading, navigate, loadStatsFromExtension, userData]);

  const handleLogout = async () => {
    localStorage.clear();
    const { signOut } = await import('firebase/auth');
    const { auth } = await import('../firebase/config');
    if (auth) await signOut(auth);
    navigate('/');
  };

  const refreshData = () => {
    window.postMessage({ type: 'REQUEST_EXTENSION_DATA' }, '*');
    loadStatsFromExtension();
  };


  if (authLoading || loading) {
    return (
      <div className="loading-screen">
        <AnimatedBackground variant="galaxy" />
        <motion.div className="loading-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="loading-spinner" />
          <p>Loading...</p>
        </motion.div>
      </div>
    );
  }

  // Comparison Helpers
  const getComparison = (key) => {
      try {
          const full = JSON.parse(localStorage.getItem('tw_latestStats'));
          if (!full || !full.previous) return null;
          const curr = full.current[key] || 0;
          const prev = full.previous[key] || 0;
          if (prev === 0) return null;
          const diff = ((curr - prev) / prev) * 100;
          return diff;
      } catch(e) { return null; }
  };

  const ComparisonBadge = ({ metric }) => {
      const diff = getComparison(metric);
      if (diff === null) return null;
      const isPositive = diff >= 0;
      return (
          <span className={`stat-badge ${isPositive ? 'positive' : 'negative'}`} style={{
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem',
              color: isPositive ? '#00ba7c' : '#f91880', marginTop: '8px'
          }}>
              {isPositive ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
              {Math.abs(diff).toFixed(0)}%
          </span>
      );
  };

  const twitterUsername = userData?.twitterUsername || localStorage.getItem('tw_username') || 'user';

  return (
    <div className="dashboard-page">
      <AnimatedBackground variant="galaxy" />

      
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo"><Twitter size={24}/></div>
          <div className="user-info"><span className="username">@{twitterUsername}</span><span className="welcome">Dashboard</span></div>
        </div>
        <div className="header-actions">
          <motion.button className="action-btn" whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={refreshData}><RefreshCw size={18}/> Refresh</motion.button>
          <motion.button className="action-btn secondary" whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={handleLogout}><LogOut size={18}/></motion.button>
        </div>
      </header>

      <main className="dashboard-content">
        {!stats ? (
          <motion.div className="no-data" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
            <div className="no-data-icon"><Download size={48}/></div>
            <h2>Ready to wrap?</h2>
            <p>Sync your data to get started.</p>
            <div className="extension-steps">
                <div className="step"><span className="step-num">1</span><p>Open Twitter/X</p></div>
                <div className="step"><span className="step-num">2</span><p>Click Extension → Sync</p></div>
            </div>
          </motion.div>
        ) : !wrappedViewed ? (
             <motion.div className="wrapped-hero-card" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}>
                <div className="hero-content">
                    <Sparkles size={64} className="hero-icon"/>
                    <h1>Your 2025 Wrapped is Ready</h1>
                    <p>We've analyzed your year. It's time.</p>
                    <motion.button className="play-wrapped-btn" whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>navigate('/wrapped')}>
                        <Play size={24} fill="currentColor"/> Watch Now
                    </motion.button>
                </div>
             </motion.div>
        ) : (
          <>
            <motion.div className="stats-hero" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
              <h1>2025 Summary</h1>
              <p>{(stats.tweetCount || 0).toLocaleString()} tweets analyzed</p>
              <motion.button className="wrapped-btn" onClick={()=>navigate('/wrapped')} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>
                <Sparkles size={20}/> Replay Wrapped
              </motion.button>
            </motion.div>

            <div className="stats-grid">
              <div className="stat-group">
                  <StatCard title="Tweets" value={stats.tweetCount || 0} icon={<MessageCircle size={24}/>} color="blue" delay={0.1}/>
                  <ComparisonBadge metric="tweetCount" />
              </div>
              <div className="stat-group">
                  <StatCard title="Total Views" value={stats.totalViews || 0} icon={<Eye size={24}/>} color="cyan" delay={0.2}/>
                  <ComparisonBadge metric="totalViews" />
              </div>
              <div className="stat-group">
                  <StatCard title="Retweets" value={stats.totalRetweets || 0} icon={<Repeat size={24}/>} color="green" delay={0.3}/>
                  <ComparisonBadge metric="totalRetweets" />
              </div>
              <div className="stat-group">
                   <StatCard title="Engagement" value={`${(stats.engagementRate||0).toFixed(1)}%`} icon={<TrendingUp size={24}/>} color="orange" isPercentage delay={0.4}/>
                   <ComparisonBadge metric="engagementRate" />
              </div>
            </div>

            {stats.topTweet && (
              <motion.div className="top-tweet-card" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.5}}>
                <div style={{display:'flex', gap:'12px', marginBottom:'12px'}}>
                    {stats.profilePic ? (
                        <img src={stats.profilePic} alt="Profile" style={{width:48, height:48, borderRadius:'50%'}} />
                    ) : (
                        <div style={{width:48, height:48, borderRadius:'50%', background:'#333', display:'flex', alignItems:'center', justifyContent:'center'}}>
                            <Twitter size={24} color="#fff"/>
                        </div>
                    )}
                    <div>
                        <div style={{fontWeight:'bold', fontSize:'1.1rem'}}>{userData?.displayName || 'User'} <span style={{color:'#8899a6', fontWeight:'normal'}}>@{twitterUsername}</span></div>
                        <div style={{color:'#8899a6', fontSize:'0.9rem'}}>Top Tweet of 2025</div>
                    </div>
                </div>
                <div className="tweet-content"><p style={{fontSize:'1.2rem', lineHeight:'1.5'}}>{stats.topTweet.text}</p></div>
                
                <div style={{display:'flex', gap:'24px', marginTop:'16px', borderTop:'1px solid #333', paddingTop:'12px', color:'#8899a6'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                        <Heart size={18} fill={stats.topTweet.likes > 0 ? "#f91880" : "none"} color={stats.topTweet.likes > 0 ? "#f91880" : "currentColor"}/> 
                        <span>{stats.topTweet.likes.toLocaleString()}</span>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                        <Repeat size={18} color="#00ba7c"/> 
                        <span>{stats.topTweet.likes.toLocaleString()}</span> {/* Using likes as proxy if RT missing or just standard */}
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                        <Eye size={18} color="#1d9bf0"/> 
                        <span>{(stats.topTweet.views || stats.totalViews / stats.tweetCount).toLocaleString()}</span>
                    </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
