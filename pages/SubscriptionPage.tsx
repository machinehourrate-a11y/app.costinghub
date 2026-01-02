
import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { User } from '../types';

interface SubscriptionPageProps {
  user: User;
  onBack: () => void;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ user, onBack }) => {
  const usagePercentage = user.calculation_limit === -1 
    ? 0 
    : Math.min(100, (user.calculations_created_this_period / user.calculation_limit) * 100);

  const handleRedirectToPricing = () => {
    window.location.href = 'https://costinghub.com/pricing';
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
       <div className="mb-6">
            <Button variant="secondary" onClick={onBack}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Settings
            </Button>
        </div>
      
      <Card className="text-center p-8 sm:p-12">
        <div className="mb-10">
            <h2 className="text-3xl font-black text-primary uppercase tracking-tight">Plan Overview</h2>
            <p className="text-text-secondary mt-2">View your current manufacturing capabilities.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 text-left">
            <div className="bg-background/50 p-6 rounded-xl border border-border">
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-4">Current Active Plan</h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-text-primary uppercase tracking-tighter">{user.plan_name || 'Free'}</span>
                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full uppercase">Active</span>
                </div>
                {user.subscription_expires_on && (
                    <p className="text-sm text-text-secondary mt-2">
                        Renews/Expires on <span className="font-bold text-text-primary">{new Date(user.subscription_expires_on).toLocaleDateString()}</span>
                    </p>
                )}
            </div>

            <div className="bg-background/50 p-6 rounded-xl border border-border">
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-4">Calculation Usage</h3>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-2xl font-black text-text-primary tracking-tighter">
                        {user.calculations_created_this_period} <span className="text-sm text-text-secondary">/ {user.calculation_limit === -1 ? '∞' : user.calculation_limit}</span>
                    </span>
                    <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Job Estimates</span>
                </div>
                <div className="w-full bg-surface h-2.5 rounded-full overflow-hidden border border-border">
                    <div 
                        className={`h-full transition-all duration-700 ease-out ${usagePercentage > 90 ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ width: `${user.calculation_limit === -1 ? 0 : usagePercentage}%` }}
                    ></div>
                </div>
                <p className="text-[10px] text-text-muted mt-2 uppercase font-black tracking-widest leading-tight">
                    Quotas reset on your billing anniversary.
                </p>
            </div>
        </div>

        <div className="bg-primary/5 p-8 rounded-2xl border border-primary/20 border-2">
            <h3 className="text-xl font-black text-text-primary mb-2 uppercase tracking-tight">Need more scale?</h3>
            <p className="text-text-secondary mb-8 max-w-lg mx-auto font-medium">
                Unlock unlimited calculations, advanced exports, and multi-user support by upgrading your plan on our website.
            </p>
            <Button onClick={handleRedirectToPricing} className="!px-12 !py-4 text-lg font-black uppercase tracking-widest shadow-glow-primary">
                View Plans & Pricing →
            </Button>
            <p className="text-[10px] text-text-muted mt-4 font-bold uppercase">Safe, secure checkout via costinghub.com</p>
        </div>
      </Card>
    </div>
  );
};
