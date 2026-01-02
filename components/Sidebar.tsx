import React, { useState, useRef, useEffect } from 'react';
import type { User, View } from '../types';
import type { Session } from '@supabase/supabase-js';
import { SUPER_ADMIN_EMAILS } from '../constants';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  user: User;
  session: Session | null;
}

const NavItem: React.FC<{
  label: string;
  view: View;
  currentView: View;
  onNavigate: (view: View) => void;
  icon: React.ReactElement;
}> = ({ label, view, currentView, onNavigate, icon }) => {
  const isActive = currentView === view;
  const classes = `flex items-center px-4 py-3 text-base sm:text-lg rounded-lg transition-colors duration-200 w-full text-left relative ${
    isActive
      ? 'bg-primary text-white font-semibold shadow-glow-primary'
      : 'text-text-secondary hover:bg-surface hover:text-text-primary'
  }`;

  return (
    <button onClick={() => onNavigate(view)} className={classes} title={label}>
      <span className="mr-3">{icon}</span>
      {label}
    </button>
  );
};

const Icons = {
    Calculations: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m-6 4h4m6 0h-2m-6-4h-2m8-4H9m-2 14h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    Materials: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7l8 4-8 4" /></svg>,
    Machines: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4M6 12a2 2 0 100-4m0 4a2 2 0 110-4M6 18a2 2 0 100-4m0 4a2 2 0 110-4m12 0a2 2 0 100-4m0 4a2 2 0 110-4" /></svg>,
    Processes: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
    Tools: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    CostMaster: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1m0-1H8m12 1h-4m-7 11H8m12 0h-4M12 21v-1m0 1v.01M12 18v-1m0-1H8m12 0h-4m-4 5a9 9 0 110-18 9 9 0 010 18z" /></svg>,
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, user, session }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
  const avatarUrl = session?.user?.user_metadata?.avatar_url;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef]);

  return (
    <aside className="bg-surface text-text-primary flex flex-col p-3 shadow-lg border-r border-border transition-all duration-300 w-64 h-full">
        <div className="py-4 mb-4 border-b border-border/50 h-[76px] flex items-center justify-between">
            <button onClick={() => onNavigate('landing')} className="text-left focus:outline-none focus:ring-2 focus:ring-primary rounded-md p-1 ml-3 flex-shrink-0 animate-fade-in">
                <h1 className="text-2xl font-bold">Costing<span className="text-primary">Hub</span></h1>
                <p className="text-xs text-text-muted">All Costs. One Hub.</p>
            </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto">
            <NavItem label="Calculations" view="calculations" icon={Icons.Calculations} {...{ currentView, onNavigate }} />
            <NavItem label="Cost Master" view="costMaster" icon={Icons.CostMaster} {...{ currentView, onNavigate }} />
            <div className="pt-2 border-t border-border/50 my-2"></div>
            <NavItem label="Materials" view="materials" icon={Icons.Materials} {...{ currentView, onNavigate }} />
            <NavItem label="Machines" view="machines" icon={Icons.Machines} {...{ currentView, onNavigate }} />
            <NavItem label="Processes" view="processes" icon={Icons.Processes} {...{ currentView, onNavigate }} />
            <NavItem label="Tools" view="toolLibrary" icon={Icons.Tools} {...{ currentView, onNavigate }} />
        </nav>
        
        <div className="mt-auto pt-2 border-t border-border/50 space-y-2">
            <div ref={dropdownRef} className="relative mt-2 border-t border-border/50 pt-2 pb-6 sm:pb-2">
                {isDropdownOpen && (
                    <div className="absolute bottom-full mb-2 w-full origin-bottom bg-surface rounded-md shadow-lg ring-1 ring-border ring-opacity-5 focus:outline-none z-20 animate-fade-in">
                        <div className="py-1" role="menu" aria-orientation="vertical">
                            <button onClick={() => { onNavigate('settings'); setIsDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background/60">
                                Settings
                            </button>
                            {isSuperAdmin && (
                                <>
                                    <button onClick={() => { onNavigate('superadmin'); setIsDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background/60">
                                        Admin Panel
                                    </button>
                                    <button onClick={() => { onNavigate('subscribersList'); setIsDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background/60">
                                        User Management
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
                <button 
                    onClick={() => setIsDropdownOpen(p => !p)} 
                    className="flex items-center w-full p-2 rounded-lg hover:bg-surface transition-colors"
                >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary overflow-hidden">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <span>{user.name.charAt(0)}</span>
                        )}
                    </div>
                    <div className="ml-3 text-left animate-fade-in flex-grow">
                        <p className="text-sm font-semibold text-text-primary truncate">{user.name}</p>
                        <p className="text-xs text-text-muted truncate">{user.companyName || 'Personal'}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-text-secondary transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 9.293a1 1 0 011.414 0L10 12.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    </aside>
  );
};