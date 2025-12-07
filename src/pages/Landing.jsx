import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Twitter, 
  Shield, 
  Sparkles, 
  BarChart3, 
  Download,
  Lock,
  Zap
} from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground'; 
import './Landing.css';

const Landing = () => {
  const [username, setUsername] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanUsername = username.replace('@', '').trim();
    if (cleanUsername) {
      sessionStorage.setItem('twitterUsername', cleanUsername);
      navigate('/auth');
    }
  };

  const features = [
    {
      icon: <Sparkles size={24} />,
      title: "Top Moments",
      desc: "Relive your best tweets and biggest viral hits of 2025."
    },
    {
      icon: <BarChart3 size={24} />,
      title: "Deep Analytics",
      desc: "Understand your engagement, reach, and audience growth."
    },
    {
      icon: <Download size={24} />,
      title: "Shareable Cards",
      desc: "Beautiful, Spotify-style summary cards ready for social media."
    }
  ];

  return (
    <div className="landing-page dark-theme">
      <AnimatedBackground variant="galaxy" />
      
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-logo">
           <Twitter size={24} className="text-white" />
           <span>Twitter Wrapped</span>
        </div>
        <button className="nav-btn" onClick={() => document.getElementById('input-section').scrollIntoView({ behavior: 'smooth'})}>
           Get Started
        </button>
      </nav>

      {/* Hero Section */}
      <main className="landing-content">
        <div className="hero-section">
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8 }}
               className="brand-pill"
            >
               <Zap size={14} fill="currentColor" />
               <span>2025 Edition Now Live</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="hero-title"
            >
              Your Twitter Year <br/>
              <span className="text-gradient">Unknown No More.</span>
            </motion.h1>

            <motion.p
               className="hero-subtitle"
               initial={{ opacity: 0 }}
               animate={{ opacity: 0.7 }}
               transition={{ delay: 0.4 }}
            >
               Connect your account to visualize your impact, engagement, and top moments of 2025. Secure, client-side, and beautiful.
            </motion.p>

            <motion.form 
                id="input-section"
                onSubmit={handleSubmit}
                className={`hero-input-group ${isFocused ? 'focused' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <div className="input-icon">@</div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="username"
                  className="hero-input"
                />
                <button type="submit" className="hero-submit-btn">
                    <ArrowRight size={20} />
                </button>
            </motion.form>
            
            <motion.div 
               className="hero-trust"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.7 }}
            >
               <Shield size={14} /> NO Password Required • Local Processing
            </motion.div>
        </div>

        {/* Feature Grid */}
        <motion.div 
            className="features-section"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
        >
           {features.map((f, i) => (
             <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
             </div>
           ))}
        </motion.div>
        
        {/* How it works */}
        <section className="how-it-works">
            <h2>How it works</h2>
            <div className="steps-container">
               <div className="step-item">
                  <span className="step-number">1</span>
                  <h4>Enter Username</h4>
                  <p>We just need your handle to identify the profile.</p>
               </div>
               <div className="step-line"></div>
               <div className="step-item">
                  <span className="step-number">2</span>
                  <h4>Sync Data</h4>
                  <p>Use our Chrome extension to securely scrape your own view.</p>
               </div>
               <div className="step-line"></div>
               <div className="step-item">
                  <span className="step-number">3</span>
                  <h4>View Wrapped</h4>
                  <p>Enjoy your personalized summary and share with friends.</p>
               </div>
            </div>
        </section>
      </main>
      
      <footer className="landing-footer-new">
         <p>© 2025 Twitter Wrapped. <Lock size={12}/> Privacy Friendly.</p>
      </footer>
    </div>
  );
};

export default Landing;
