import React from 'react';
import { toast as reactHotToast } from 'react-hot-toast';

type ToastVariant = 'default' | 'destructive' | 'success' | 'warning';

type ToastProps = {
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
};

const variantStyles = {
  default: { 
    className: 'bg-gray-800 text-white',
    icon: '🔔' 
  },
  destructive: { 
    className: 'bg-red-700 text-white',
    icon: '⚠️' 
  },
  success: { 
    className: 'bg-green-700 text-white',
    icon: '✅' 
  },
  warning: { 
    className: 'bg-yellow-700 text-white',
    icon: '⚠️' 
  }
};

export function useToast() {
  const toast = ({ title, description, variant = 'default', duration = 3000 }: ToastProps) => {
    const variantStyle = variantStyles[variant];
    
    reactHotToast(
      (t) => (
        <div className={`${variantStyle.className} p-4 rounded shadow-lg max-w-md`}>
          {title && <h4 className="font-bold mb-1">{title}</h4>}
          <p>{description}</p>
        </div>
      ),
      {
        duration,
        icon: variantStyle.icon,
        position: 'top-right',
      }
    );
  };

  return { toast };
}

export function Toast() {
  return null; // This is a dummy component as we're using react-hot-toast
} 