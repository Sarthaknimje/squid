import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

const variantStyles = {
  default: 'bg-squid-pink hover:bg-opacity-90 text-white',
  outline: 'bg-transparent border border-squid-pink text-squid-pink hover:bg-squid-pink hover:bg-opacity-10',
  ghost: 'bg-transparent hover:bg-gray-800 text-white',
  link: 'bg-transparent underline-offset-4 hover:underline text-squid-pink',
  destructive: 'bg-red-500 hover:bg-red-600 text-white',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className = '', 
    variant = 'default', 
    size = 'md', 
    children, 
    ...props 
  }, ref) => {
    return (
      <button
        className={`font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-squid-pink disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button }; 