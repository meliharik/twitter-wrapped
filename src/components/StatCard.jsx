import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './StatCard.css';

const StatCard = ({ title, value, icon, color = 'blue', delay = 0, isPercentage = false }) => {
  const countRef = useRef(null);
  
  const gradients = {
    blue: 'linear-gradient(135deg, #1d9bf0, #1a8cd8)',
    cyan: 'linear-gradient(135deg, #00bcd4, #0097a7)',
    pink: 'linear-gradient(135deg, #f91880, #e91e63)',
    green: 'linear-gradient(135deg, #00ba7c, #00897b)',
    orange: 'linear-gradient(135deg, #ff7a00, #f57c00)',
    purple: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  };

  useEffect(() => {
    if (!countRef.current || isPercentage) return;
    
    const target = typeof value === 'number' ? value : parseInt(value) || 0;
    const duration = 1500;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(target * easeOutQuart);
      
      if (countRef.current) {
        countRef.current.textContent = current.toLocaleString('en-US');
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    const timer = setTimeout(() => requestAnimationFrame(animate), delay * 1000);
    return () => clearTimeout(timer);
  }, [value, delay, isPercentage]);

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <div className="stat-icon" style={{ background: gradients[color] }}>
        {icon}
      </div>
      <div className="stat-content">
        <span className="stat-value" ref={isPercentage ? null : countRef}>
          {isPercentage ? value : '0'}
        </span>
        <span className="stat-title">{title}</span>
      </div>
    </motion.div>
  );
};

export default StatCard;
