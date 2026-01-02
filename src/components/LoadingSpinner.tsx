
import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-text-primary animate-fade-in">
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-text-primary">Costing<span className="text-primary">Hub</span></h1>
      </div>
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-text-secondary">Loading your manufacturing data...</p>
    </div>
  );
};
