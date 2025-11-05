

import React from 'react';
import type { User, View } from '../types';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  user: User;
}

const NavItem: React.FC<{
  label: string;
  view: View;
  currentView: View;
  onNavigate: (view: View) => void;
  icon: React.ReactElement;
}> = ({ label, view, currentView, onNavigate, icon }) => {
  const isActive = currentView === view;
  const classes = `flex items-center px-4 py-3 text-lg rounded-lg transition-colors duration-200 w-full text-left relative ${
    isActive
      ? 'bg-primary text-white font-semibold shadow-glow-primary'
      : 'text-text-secondary hover:bg-surface/50 hover:text-text-primary'
  }`;

  return (
    <button onClick={() => onNavigate(view)} className={classes}>
      <span className="mr-3">{icon}</span>
      {label}
    </button>
  );
};

const Icons = {
    Calculations: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m-6 4h6m-6 4h4m6 0h-2m-6-4h-2m8-4H9m-2 14h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    Materials: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7l8 4-8 4" /></svg>,
    Machines: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m12 0a2 2 0 100-4m0 4a2 2 0 110-4M6 12a2 2 0 100-4m0 4a2 2 0 110-4m12 0a2 2 0 100-4m0 4a2 2 0 110-4M6 18a2 2 0 100-4m0 4a2 2 0 110-4m12 0a2 2 0 100-4m0 4a2 2 0 110-4" /></svg>,
    Processes: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
    Tools: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    Subscription: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
    Feedback: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, user }) => {
  return (
    <aside className="w-64 bg-surface text-text-primary flex flex-col p-4 shadow-lg border-r border-border">
        <div className="text-center py-4 mb-6 border-b border-border/50">
            <button onClick={() => onNavigate('calculations')} className="focus:outline-none focus:ring-2 focus:ring-primary rounded-md">
                <h1 className="text-2xl font-bold">Costing<span className="text-primary">Hub</span></h1>
            </button>
            <p className="text-xs text-text-muted">All Costs. One Hub.</p>
        </div>
        <nav className="flex-1 space-y-2">
            <NavItem label="Machining Calculation" view="calculations" icon={Icons.Calculations} {...{ currentView, onNavigate }} />
            <NavItem label="Material Library" view="materials" icon={Icons.Materials} {...{ currentView, onNavigate }} />
            <NavItem label="Machine Library" view="machines" icon={Icons.Machines} {...{ currentView, onNavigate }} />
            <NavItem label="Process Library" view="processes" icon={Icons.Processes} {...{ currentView, onNavigate }} />
            <NavItem label="Tool Library" view="toolLibrary" icon={Icons.Tools} {...{ currentView, onNavigate }} />
            <NavItem label="Subscription" view="subscription" icon={Icons.Subscription} {...{ currentView, onNavigate }} />
            <NavItem label="Feedback & Requests" view="feedback" icon={Icons.Feedback} {...{ currentView, onNavigate }} />
        </nav>
        <div className="mt-auto">
            <p className="text-xs text-center text-text-muted pt-4">&copy; 2024 CostingHub Inc.</p>
        </div>
    </aside>
  );
};
