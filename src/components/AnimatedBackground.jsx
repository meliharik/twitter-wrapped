import { motion } from 'framer-motion';
import './AnimatedBackground.css';

const AnimatedBackground = ({ variant = 'blue' }) => {
  const gradients = {
    purple: ['#8b5cf6', '#ec4899', '#6366f1'],
    blue: ['#1d9bf0', '#00bcd4', '#1a8cd8'],
    green: ['#00ba7c', '#00bcd4', '#1d9bf0'],
    orange: ['#ff7a00', '#f91880', '#1d9bf0'],
  };

  const colors = gradients[variant] || gradients.blue;

  return (
    <div className="animated-background">
      <div className="gradient-orbs">
        {colors.map((color, index) => (
          <motion.div
            key={index}
            className="orb"
            style={{
              background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
            }}
            animate={{
              x: [0, 100, -50, 0],
              y: [0, -100, 50, 0],
              scale: [1, 1.2, 0.9, 1],
            }}
            transition={{
              duration: 20 + index * 5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 2,
            }}
          />
        ))}
      </div>
      <div className="noise-overlay" />
    </div>
  );
};

export default AnimatedBackground;
