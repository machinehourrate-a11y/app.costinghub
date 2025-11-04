import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-surface border border-border/50 shadow-lg rounded-xl p-6 sm:p-8 ${className}`}>
      {children}
    </div>
  );
};