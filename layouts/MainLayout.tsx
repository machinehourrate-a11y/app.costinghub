import React, { useState, useEffect, useRef } from 'react';
import type { User, View, Calculation } from '../types';
import { Sidebar } from '../components/Sidebar';
import { ThemeToggle } from '../components/ThemeToggle';
import { SUPER_ADMIN_EMAILS } from '../constants';

interface MainLayoutProps {
  user: User;
  currentView: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
  editingCalculation: Calculation | null;
  onLogout: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const viewTitles: { [key in View]: string } = {
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
    // FIX: Added 'resetPassword' to satisfy the 'View' type and resolve TypeScript error.
    resetPassword: 'Reset Password',
};


export const MainLayout: React.FC<MainLayoutProps> = ({ user, currentView, onNavigate, children, editingCalculation, onLogout, theme, setTheme }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const title = viewTitles[currentView] || 'Calculations';
    
    // Special title for editing a calculation
    const isEditing = currentView === 'calculator' && editingCalculation; 
    const pageTitle = isEditing ? 'Edit Calculation' : title;
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownRef]);


  return (
    <div className="min-h-screen flex bg-background">
      {currentView !== 'landing' && <Sidebar user={user} currentView={currentView} onNavigate={onNavigate} />}
      <div className="flex-1 flex flex-col">
        <header className="bg-surface shadow-sm p-4 border-b border-border">
          <div className="w-full mx-auto flex justify-between items-center">
             <h1 className="text-2xl font-bold text-primary">{pageTitle}</h1>
             <div className="flex items-center space-x-4">
                <ThemeToggle theme={theme} setTheme={setTheme} />
                <div className="relative" ref={dropdownRef}>
                    <button 
                        onClick={() => setIsDropdownOpen(prev => !prev)} 
                        className="flex items-center space-x-1 p-2 rounded-lg hover:bg-background/60 transition-colors"
                    >
                        <span className="text-text-secondary">Welcome, {user.name}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-text-muted transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 origin-top-right bg-surface rounded-md shadow-lg ring-1 ring-border ring-opacity-5 focus:outline-none z-20 animate-fade-in">
                            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                <button onClick={() => { onNavigate('settings'); setIsDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background/60">
                                    Settings
                                </button>
                                {isSuperAdmin && (
                                    <>
                                        <button onClick={() => { onNavigate('superadmin'); setIsDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background/60">
                                            Subscription Plans
                                        </button>
                                        <button onClick={() => { onNavigate('subscribersList'); setIsDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background/60">
                                            Subscribers List
                                        </button>
                                    </>
                                )}
                                <div className="border-t border-border my-1"></div>
                                <button onClick={() => { onLogout(); setIsDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-red-500 hover:bg-background/60">
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
             </div>
          </div>
        </header>
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto`}>
          {children}
        </main>
      </div>
    </div>
  );
};
