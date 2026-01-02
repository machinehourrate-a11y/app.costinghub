
import React, { useState, useEffect, useRef } from 'react';
import type { User, View, Calculation, CalculatorHeaderInfo } from '../types';
import type { Session } from '@supabase/supabase-js';
import { Sidebar } from '../components/Sidebar';
import { ThemeToggle } from '../components/ThemeToggle';
import { SUPER_ADMIN_EMAILS } from '../constants';

interface MainLayoutProps {
  user: User;
  session: Session | null;
  currentView: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
  editingCalculation: Calculation | null;
  calculatorHeaderInfo: CalculatorHeaderInfo;
  onLogout: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const viewTitles: Record<View, string> = {
    auth: 'Authentication',
    landing: 'Welcome',
    calculations: 'Machining Calculation',
    calculator: 'New Calculation',
    results: 'Calculation Results',
    materials: 'Material Library',
    machines: 'Machine Library',
    processes: 'Process Library',
    toolLibrary: 'Tool Library',
    costMaster: 'Cost Master',
    settings: 'Settings',
    superadmin: 'Super Admin Panel',
    subscription: 'Subscription Plans',
    subscribersList: 'Subscribers List',
    feedback: 'Feedback & Requests',
    feedbackList: 'User Feedback',
    changelog: 'Software Changelog',
    resetPassword: 'Reset Password',
    documentation: 'User Documentation & Help',
    oauthConsent: 'OAuth Consent',
};

const MenuIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

export const MainLayout: React.FC<MainLayoutProps> = ({ user, session, currentView, onNavigate, children, editingCalculation, calculatorHeaderInfo, onLogout, theme, setTheme }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    
    const title = viewTitles[currentView] || 'Calculations';
    const isEditing = currentView === 'calculator' && editingCalculation; 
    const pageTitle = isEditing ? 'Edit Calculation' : title;

    const partNumber = calculatorHeaderInfo?.partNumber || editingCalculation?.inputs.partNumber;
    const calculationNumber = calculatorHeaderInfo?.calculationNumber || editingCalculation?.inputs.calculationNumber;

    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
    const avatarUrl = session?.user?.user_metadata?.avatar_url;

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [currentView]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

  return (
    <div className="h-screen flex bg-background overflow-hidden relative">
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`
          fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
          <Sidebar 
              user={user} 
              session={session}
              currentView={currentView} 
              onNavigate={onNavigate}
          />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="bg-surface/80 backdrop-blur-sm sticky top-0 z-10 p-4 h-16 flex items-center border-b border-border flex-shrink-0">
          <div className="w-full flex justify-between items-center">
             <div className="flex items-center gap-3">
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-1 rounded-md text-text-secondary hover:bg-surface hover:text-text-primary focus:outline-none lg:hidden"
                >
                    <MenuIcon />
                </button>
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                    <h1 className="text-sm font-bold text-text-primary tracking-tight">{pageTitle}</h1>
                </div>
             </div>
             
             <div className="flex items-center gap-4">
                {currentView === 'calculator' && (partNumber || calculationNumber) && (
                    <div className="hidden md:flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-text-muted bg-background px-3 py-1 rounded-full border border-border">
                        {partNumber && <span>Part: {partNumber}</span>}
                        {calculationNumber && <span>Calc: {calculationNumber}</span>}
                    </div>
                )}
                <div className="h-4 w-px bg-border mx-1 hidden sm:block"></div>
                
                <ThemeToggle theme={theme} setTheme={setTheme} />
                
                {/* User Dropdown */}
                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-2 focus:outline-none hover:bg-surface rounded-full p-1 transition-colors border border-transparent hover:border-border"
                    >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <span>{user.name.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div className="hidden md:block text-right mr-1">
                            <p className="text-xs font-bold text-text-primary leading-none">{user.name}</p>
                            <p className="text-[10px] text-text-muted leading-none mt-0.5">{user.companyName || 'Personal'}</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-text-muted transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {isUserMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 origin-top-right bg-surface border border-border rounded-lg shadow-xl z-50 animate-fade-in">
                            <div className="px-4 py-3 border-b border-border bg-background/50 rounded-t-lg">
                                <p className="text-sm font-bold text-text-primary truncate">{user.name}</p>
                                <p className="text-xs text-text-muted truncate">{user.email}</p>
                            </div>
                            <div className="py-1">
                                <button onClick={() => { onNavigate('settings'); setIsUserMenuOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-text-secondary hover:bg-background hover:text-text-primary transition-colors">
                                    Settings
                                </button>
                                <button onClick={() => { onNavigate('subscription'); setIsUserMenuOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-text-secondary hover:bg-background hover:text-text-primary transition-colors">
                                    Subscription
                                </button>
                                {isSuperAdmin && (
                                    <>
                                        <button onClick={() => { onNavigate('superadmin'); setIsUserMenuOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-text-secondary hover:bg-background hover:text-text-primary transition-colors">
                                            Admin Panel
                                        </button>
                                        <button onClick={() => { onNavigate('subscribersList'); setIsUserMenuOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-text-secondary hover:bg-background hover:text-text-primary transition-colors">
                                            User Management
                                        </button>
                                    </>
                                )}
                            </div>
                            <div className="border-t border-border py-1">
                                <button onClick={() => { onLogout(); setIsUserMenuOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
                                    Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
             </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-[#FDFDFE]">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
