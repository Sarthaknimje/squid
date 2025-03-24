import React from 'react';
import { motion } from 'framer-motion';

interface RockPaperScissorsIconProps {
  size?: number;
  color?: string;
  animated?: boolean;
}

const RockPaperScissorsIcon: React.FC<RockPaperScissorsIconProps> = ({
  size = 40,
  color = '#ff007a', // Default to squid pink
  animated = true
}) => {
  // Animation variants
  const containerVariants = {
    animate: {
      rotate: animated ? [0, 360] : 0,
      transition: {
        repeat: Infinity,
        repeatType: 'loop' as const,
        duration: 20,
        ease: 'linear'
      }
    }
  };

  const rockVariants = {
    animate: animated ? {
      y: [0, -5, 0],
      transition: {
        repeat: Infinity,
        repeatType: 'reverse' as const,
        duration: 1.5,
        ease: 'easeInOut'
      }
    } : {}
  };

  const paperVariants = {
    animate: animated ? {
      x: [0, 5, 0],
      transition: {
        repeat: Infinity,
        repeatType: 'reverse' as const,
        duration: 2,
        ease: 'easeInOut',
        delay: 0.3
      }
    } : {}
  };

  const scissorsVariants = {
    animate: animated ? {
      scale: [1, 1.1, 1],
      transition: {
        repeat: Infinity,
        repeatType: 'reverse' as const,
        duration: 1.2,
        ease: 'easeInOut',
        delay: 0.6
      }
    } : {}
  };

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={containerVariants}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle */}
        <circle cx="50" cy="50" r="48" fill="#111" stroke={color} strokeWidth="2" />
        
        {/* Rock (fist icon) */}
        <motion.g variants={rockVariants}>
          <path
            d="M35 42C35 38.5 36.5 35 40 35C43.5 35 45 38.5 45 42V55C45 58.5 43.5 62 40 62C36.5 62 35 58.5 35 55V42Z"
            fill={color}
            opacity="0.7"
          />
        </motion.g>
        
        {/* Paper (document icon) */}
        <motion.g variants={paperVariants}>
          <rect
            x="55"
            y="35"
            width="20"
            height="27"
            rx="2"
            fill={color}
            opacity="0.7"
          />
          <rect 
            x="59" 
            y="40" 
            width="12" 
            height="2" 
            rx="1" 
            fill="white" 
          />
          <rect 
            x="59" 
            y="45" 
            width="12" 
            height="2" 
            rx="1" 
            fill="white" 
          />
          <rect 
            x="59" 
            y="50" 
            width="8" 
            height="2" 
            rx="1" 
            fill="white" 
          />
        </motion.g>
        
        {/* Scissors */}
        <motion.g variants={scissorsVariants}>
          <path
            d="M50 70C50 70 46 73 42 73C38 73 35 70 35 66C35 62 38 59 42 59C46 59 50 62 50 62V70Z"
            fill={color}
            opacity="0.7"
          />
          <path
            d="M50 70C50 70 54 73 58 73C62 73 65 70 65 66C65 62 62 59 58 59C54 59 50 62 50 62V70Z"
            fill={color}
            opacity="0.7"
          />
          <circle
            cx="50"
            cy="66"
            r="2"
            fill={color}
          />
        </motion.g>
      </svg>
    </motion.div>
  );
};

export default RockPaperScissorsIcon; 