
import React from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import type { SubscriptionPlan } from '../types';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGateway: (gateway: 'razorpay' | 'stripe') => void;
  plan: SubscriptionPlan;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({ isOpen, onClose, onSelectGateway, plan }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="max-w-md w-full relative text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">Checkout</h2>
        <p className="text-text-secondary mb-6">Upgrade to <strong>{plan.name}</strong> plan</p>
        
        <div className="grid grid-cols-1 gap-4">
          <Button onClick={() => onSelectGateway('razorpay')} className="flex items-center justify-center py-4 bg-[#3395FF] hover:bg-[#2081E2] border-none shadow-lg">
             Pay with Razorpay
          </Button>
          <Button onClick={() => onSelectGateway('stripe')} className="flex items-center justify-center py-4 bg-[#635BFF] hover:bg-[#5851E1] border-none shadow-lg">
             Pay with Stripe
          </Button>
        </div>

        <div className="mt-6">
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-sm font-medium">
            Cancel and Return
          </button>
        </div>
      </Card>
    </div>
  );
};
