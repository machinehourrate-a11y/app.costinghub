
import React from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface SubscriptionUpgradeModalProps {
  onClose: () => void;
  onNavigate: () => void;
}

export const SubscriptionUpgradeModal: React.FC<SubscriptionUpgradeModalProps> = ({ onClose, onNavigate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="max-w-md w-full relative">
        <h2 className="text-xl font-bold text-primary mb-4">Upgrade Your Plan</h2>
        <p className="text-text-secondary mb-6">You have reached the calculation limit for the Free plan. Please upgrade to the Professional plan to create more calculations.</p>
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={onClose}>Maybe Later</Button>
          <Button onClick={onNavigate}>View Plans</Button>
        </div>
      </Card>
    </div>
  );
};
