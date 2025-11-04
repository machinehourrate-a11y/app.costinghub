
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', type = 'button', ...props }) => {
  const baseClasses = 'inline-flex justify-center items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300';
  
  const variantClasses = {
    primary: 'text-white bg-primary hover:bg-primary-hover focus:ring-primary hover:shadow-glow-primary',
    secondary: 'text-text-primary bg-surface hover:bg-background border-border focus:ring-primary'
  };

  return (
    <button
      type={type}
      {...props}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
