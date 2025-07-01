import React from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  loading?: boolean;
}

const cardVariants: Variants = {
  initial: { 
    scale: 1,
    y: 0
  },
  hover: { 
    scale: 1.02,
    y: -4,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  tap: { 
    scale: 0.98,
    transition: { duration: 0.1, ease: "easeOut" }
  }
};

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  hover = true,
  className = '',
  onClick,
  onDoubleClick,
  loading = false
}) => {
  const baseClasses = `
    relative overflow-hidden rounded-2xl transition-all duration-300
    backdrop-blur-md border shadow-lg
    ${onClick ? 'cursor-pointer' : ''}
  `;

  const variantClasses = {
    default: `
      bg-white/5 border-white/10 shadow-white/5
      hover:bg-white/8 hover:border-white/20 hover:shadow-white/10
    `,
    elevated: `
      bg-gradient-to-br from-white/10 to-white/5 border-white/20
      shadow-xl shadow-black/20
      hover:from-white/15 hover:to-white/8 hover:shadow-2xl hover:shadow-black/30
    `,
    outlined: `
      bg-transparent border-2 border-white/20
      hover:border-white/40 hover:bg-white/5
    `,
    glass: `
      bg-white/5 border-white/10 backdrop-blur-xl
      shadow-lg shadow-black/10
      hover:bg-white/8 hover:shadow-xl hover:shadow-black/20
    `
  };

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const loadingClasses = loading ? 'animate-pulse' : '';

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${loadingClasses} ${className}`}
      variants={cardVariants}
      initial="initial"
      whileHover={hover && onClick ? "hover" : undefined}
      whileTap={onClick ? "tap" : undefined}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {/* Glassmorphic overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-white/10 rounded animate-pulse" />
            <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse" />
          </div>
        ) : (
          children
        )}
      </div>

      {/* Subtle border glow */}
      <div className="absolute inset-0 rounded-2xl border border-white/5 pointer-events-none" />
    </motion.div>
  );
};

export default Card; 