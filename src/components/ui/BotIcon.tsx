"use client";

import { FaRobot, FaBrain, FaRunning, FaShieldAlt, FaChessKnight } from "react-icons/fa";
import { motion } from "framer-motion";

type BotIconProps = {
  type: 'default' | 'strategic' | 'speedy' | 'defensive' | 'balanced';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  level?: number;
  animated?: boolean;
  className?: string;
};

const BotIcon = ({ 
  type = 'default', 
  size = 'md', 
  level, 
  animated = true,
  className = '' 
}: BotIconProps) => {
  
  // Map size to dimensions
  const sizeMap = {
    sm: {
      container: 'w-12 h-12',
      icon: 'text-2xl',
      level: 'text-xs'
    },
    md: {
      container: 'w-16 h-16',
      icon: 'text-3xl',
      level: 'text-sm'
    },
    lg: {
      container: 'w-20 h-20',
      icon: 'text-4xl',
      level: 'text-base'
    },
    xl: {
      container: 'w-24 h-24',
      icon: 'text-5xl',
      level: 'text-xl'
    }
  };

  // Map type to icon and colors
  const typeConfig = {
    default: {
      icon: FaRobot,
      bgFrom: 'from-pink-500',
      bgTo: 'to-purple-600',
      glowClass: 'shadow-glow-purple'
    },
    strategic: {
      icon: FaChessKnight,
      bgFrom: 'from-green-500',
      bgTo: 'to-emerald-700',
      glowClass: 'shadow-glow-green'
    },
    speedy: {
      icon: FaRunning,
      bgFrom: 'from-amber-500',
      bgTo: 'to-yellow-600',
      glowClass: 'shadow-glow-yellow'
    },
    defensive: {
      icon: FaShieldAlt,
      bgFrom: 'from-red-500',
      bgTo: 'to-rose-700',
      glowClass: 'shadow-glow-red'
    },
    balanced: {
      icon: FaBrain,
      bgFrom: 'from-blue-500',
      bgTo: 'to-indigo-700',
      glowClass: 'shadow-glow'
    }
  };

  const config = typeConfig[type];
  const sizeConfig = sizeMap[size];
  const Icon = config.icon;

  return (
    <motion.div 
      className={`relative rounded-full flex items-center justify-center overflow-hidden ${sizeConfig.container} ${config.glowClass} ${className}`}
      initial={animated ? { scale: 0.9 } : {}}
      animate={animated ? { 
        scale: [0.95, 1, 0.95],
        rotate: [0, 2, -2, 0],
      } : {}}
      transition={animated ? { 
        duration: 3, 
        repeat: Infinity,
        repeatType: "reverse"
      } : {}}
    >
      <Icon className={`${sizeConfig.icon} text-white z-10`} />
      
      <div className={`absolute inset-0 bg-gradient-to-br ${config.bgFrom} ${config.bgTo} opacity-75`}></div>
      
      {level !== undefined && (
        <motion.div 
          className={`absolute -bottom-1 -right-1 bg-gray-800 rounded-full w-6 h-6 flex items-center justify-center border-2 border-gray-700 z-20`}
          initial={animated ? { scale: 0.8 } : {}}
          animate={animated ? { scale: [0.8, 1, 0.8] } : {}}
          transition={animated ? { 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse" 
          } : {}}
        >
          <span className={`font-bold text-white ${sizeConfig.level}`}>{level}</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BotIcon; 