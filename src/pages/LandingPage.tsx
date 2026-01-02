
import React from 'react';
import type { View, User } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface LandingPageProps {
  onNavigate: (view: View) => void;
  user: User;
}

const DetailRow: React.FC<{ label: string; value: string | number | null }> = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
        <span className="text-text-secondary text-sm font-medium">{label}</span>
        <span className="text-text-primary text-sm font-bold">{value || 'N/A'}</span>
    </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, user }) => {
    const usagePercentage = user.calculation_limit === -1 
        ? 0 
        : Math.min(100, (user.calculations_created_this_period / user.calculation_limit) * 100);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase">Account <span className="text-primary italic">Overview</span></h1>
            <p className="text-text-secondary mt-1">Industrial Command Center for {user.name}</p>
          </div>
          <Button onClick={() => onNavigate('calculations')} className="!py-4 !px-8 shadow-glow-primary uppercase font-black tracking-widest text-sm">
            Open Calculator Hub →
          </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-7">
            <Card className="h-full">
                <div className="flex items-center gap-6 mb-8 pb-6 border-b border-border">
                    <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border-2 border-primary/20">
                        {user.company_logo_url ? (
                            <img src={user.company_logo_url} alt="Logo" className="w-full h-full object-contain p-2 rounded-xl" />
                        ) : (
                            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">{user.name}</h2>
                        <p className="text-text-secondary font-medium">{user.email}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                    <div className="space-y-1">
                        <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">Organization</h3>
                        <DetailRow label="Company" value={user.companyName} />
                        <DetailRow label="Industry" value={user.industry} />
                        <DetailRow label="Company Size" value={user.company_size} />
                        <DetailRow label="Tax / VAT ID" value={user.tax_id} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">Contact & Location</h3>
                        <DetailRow label="Phone" value={user.phone ? `${user.phone_country_code || ''} ${user.phone}` : null} />
                        <DetailRow label="City" value={user.city} />
                        <DetailRow label="Country" value={user.country} />
                        <DetailRow label="Website" value={user.company_website} />
                    </div>
                </div>
            </Card>
        </div>

        {/* Plan & Usage Card */}
        <div className="lg:col-span-5 flex flex-col gap-6">
            <Card className="bg-primary/5 border-primary/20 border-2">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-sm font-black text-text-muted uppercase tracking-widest mb-1">Active Membership</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-primary uppercase tracking-tighter">{user.plan_name || 'Free'}</span>
                            <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full uppercase">Active</span>
                        </div>
                    </div>
                    <div className="text-right">
                         <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-1">Status</h3>
                         <span className="text-sm font-bold text-text-primary uppercase">{user.subscription_status || 'Standard'}</span>
                    </div>
                </div>
                
                {user.subscription_expires_on && (
                    <div className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-8 bg-surface/50 p-2 rounded-lg border border-border">
                        <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Membership valid until <span className="text-text-primary font-bold">{new Date(user.subscription_expires_on).toLocaleDateString()}</span>
                    </div>
                )}

                <div className="space-y-4 pt-4 border-t border-primary/10">
                    <div className="flex justify-between items-end">
                        <h3 className="text-sm font-black text-text-muted uppercase tracking-widest">Calculation Usage</h3>
                        <span className="text-lg font-black text-text-primary">
                            {user.calculations_created_this_period} <span className="text-sm text-text-secondary">/ {user.calculation_limit === -1 ? '∞' : user.calculation_limit}</span>
                        </span>
                    </div>
                    <div className="w-full bg-surface h-3 rounded-full overflow-hidden border border-border">
                        <div 
                            className={`h-full transition-all duration-700 ease-out ${usagePercentage > 90 ? 'bg-red-500' : 'bg-primary'}`}
                            style={{ width: `${user.calculation_limit === -1 ? 0 : usagePercentage}%` }}
                        ></div>
                    </div>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest leading-tight">
                        Used <span className="text-primary">{user.calculations_created_this_period}</span> of your <span className="text-primary">{user.calculation_limit === -1 ? 'unlimited' : user.calculation_limit}</span> monthly quota. Quota resets on billing anniversary.
                    </p>
                </div>
            </Card>

            <Card className="flex flex-col items-center justify-center p-6 text-center border-dashed bg-surface/30">
                 <h3 className="text-lg font-bold text-text-primary mb-2">Need more calculations?</h3>
                 <p className="text-sm text-text-secondary mb-4 leading-relaxed">Upgrade to Pro for unlimited machining estimates and advanced exports.</p>
                 <Button variant="secondary" onClick={() => window.location.href = 'https://costinghub.com/pricing'} className="w-full text-xs font-bold uppercase tracking-widest border-2">View Pro Features</Button>
            </Card>
        </div>
      </div>
    </div>
  );
};
