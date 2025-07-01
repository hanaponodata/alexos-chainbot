import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

interface InputProps {
  value?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  error?: string;
  success?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  fullWidth?: boolean;
}

const inputVariants: Variants = {
  initial: { scale: 1 },
  focus: { 
    scale: 1.01,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  error: { 
    x: [-4, 4, -4, 4, 0],
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

const Input = forwardRef<HTMLInputElement, InputProps>(({
  value = '',
  placeholder,
  type = 'text',
  variant = 'default',
  size = 'md',
  disabled = false,
  error,
  success = false,
  icon,
  iconPosition = 'left',
  onChange,
  onFocus,
  onBlur,
  className = '',
  fullWidth = false
}, ref) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const baseClasses = `
    relative overflow-hidden rounded-xl font-medium transition-all duration-200
    backdrop-blur-md border shadow-sm
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
    disabled:cursor-not-allowed disabled:opacity-50
    ${fullWidth ? 'w-full' : ''}
  `;

  const variantClasses = {
    default: `
      bg-white/5 border-white/10 text-white placeholder-gray-400
      hover:bg-white/8 hover:border-white/20
      focus:bg-white/10 focus:border-blue-500/50 focus:ring-blue-500/50
    `,
    filled: `
      bg-white/10 border-white/20 text-white placeholder-gray-300
      hover:bg-white/15 hover:border-white/30
      focus:bg-white/20 focus:border-blue-500/50 focus:ring-blue-500/50
    `,
    outlined: `
      bg-transparent border-2 border-white/20 text-white placeholder-gray-400
      hover:border-white/40 hover:bg-white/5
      focus:border-blue-500/50 focus:ring-blue-500/50 focus:bg-white/5
    `
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  const stateClasses = error 
    ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50'
    : success 
    ? 'border-green-500/50 focus:border-green-500/50 focus:ring-green-500/50'
    : '';

  const iconClasses = icon 
    ? iconPosition === 'left' ? 'pl-12' : 'pr-12'
    : '';

  return (
    <div className="relative">
      <motion.div
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${stateClasses} ${iconClasses} ${className}`}
        variants={inputVariants}
        initial="initial"
        animate={isFocused ? "focus" : error ? "error" : "initial"}
      >
        {/* Icon */}
        {icon && (
          <div className={`absolute top-1/2 transform -translate-y-1/2 ${iconPosition === 'left' ? 'left-4' : 'right-4'} text-gray-400`}>
            {icon}
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full bg-transparent border-none outline-none text-white placeholder-gray-400"
        />

        {/* Glassmorphic overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none rounded-xl" />
      </motion.div>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-red-400 flex items-center gap-2"
        >
          <span className="w-1 h-1 bg-red-400 rounded-full" />
          {error}
        </motion.p>
      )}

      {/* Success indicator */}
      {success && !error && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400"
        >
          ✓
        </motion.div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input; 