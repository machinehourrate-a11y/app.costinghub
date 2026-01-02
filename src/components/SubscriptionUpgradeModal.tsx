import React from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface SubscriptionUpgradeModalProps {
  onClose: () => void;
  message?: string;
  featureName?: string;
}

export const SubscriptionUpgradeModal: React.FC<SubscriptionUpgradeModalProps> = ({ 
  onClose,
  message = "You've reached the calculation limit for your current plan.",
  featureName = "unlimited calculations and advanced features"
}) => {
  
  const handleRedirect = () => {
    window.location.href = 'https://costinghub.com/pricing';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="max-w-md w-full relative text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight mb-4">Upgrade Required</h2>
        <p className="text-text-secondary mb-8 leading-relaxed font-medium">
          {message} Please upgrade your subscription to unlock {featureName}.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Button variant="secondary" onClick={onClose} className="uppercase font-bold tracking-widest text-xs">Maybe Later</Button>
          <Button onClick={handleRedirect} className="uppercase font-black tracking-widest text-xs shadow-glow-primary">Upgrade Plan</Button>
        </div>
      </Card>
    </div>
  );
};
