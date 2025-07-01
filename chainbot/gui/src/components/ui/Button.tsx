import React from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  onClick,
  className = '',
  fullWidth = false,
  type = 'button',
}) => {
  const base = `inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent select-none ${fullWidth ? 'w-full' : ''}`;
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg',
  };
  const variants = {
    primary: `bg-blue-600 hover:bg-blue-700 text-white shadow-md ${icon && !children ? 'rounded-full p-0 w-11 h-11' : ''}`,
    secondary: `bg-[#23232a] hover:bg-[#23232a]/80 text-gray-100 border border-[#23232a]`,
    ghost: `bg-transparent hover:bg-[#23232a]/60 text-gray-400`,
  };
  return (
    <motion.button
      type={type}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.05 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-white/30 border-t-blue-500 rounded-full animate-spin mr-2" />
      ) : icon ? (
        <span className={`flex-shrink-0 ${children ? 'mr-2' : ''}`}>{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
    </motion.button>
  );
};

export default Button; 