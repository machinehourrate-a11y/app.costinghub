
import React from 'react';
import { Card } from '../components/ui/Card';
import type { SuperAdminPageProps } from '../types';
import { Button } from '../components/ui/Button';

export const SuperAdminPage: React.FC<SuperAdminPageProps> = ({ onNavigate }) => {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in">
      <Card>
        <div className="text-center p-8">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow-primary/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h2 className="text-3xl font-black text-text-primary uppercase tracking-tight mb-4">Master Administration</h2>
            <p className="text-text-secondary max-w-lg mx-auto mb-10 font-medium">
                Manage high-level system components. User provisioning and plan assignments are processed asynchronously via webhooks from WordPress.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <Button 
                    variant="secondary" 
                    className="flex flex-col items-center p-10 h-auto border-2 border-border hover:border-primary group transition-all"
                    onClick={() => onNavigate('subscribersList')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 text-text-muted group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="text-xl font-black uppercase tracking-widest">Global Users</span>
                    <span className="text-[10px] uppercase font-bold text-text-muted mt-2 tracking-widest">Read-only Directory</span>
                </Button>
                
                <Button 
                    variant="secondary" 
                    className="flex flex-col items-center p-10 h-auto border-2 border-border hover:border-primary group transition-all"
                    onClick={() => onNavigate('feedbackList')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 text-text-muted group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 01-2-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span className="text-xl font-black uppercase tracking-widest">Intelligence</span>
                    <span className="text-[10px] uppercase font-bold text-text-muted mt-2 tracking-widest">Feedback & Analytics</span>
                </Button>
            </div>
            
            <div className="mt-12 p-6 bg-surface rounded-xl border border-border inline-block border-dashed">
                <p className="text-xs font-bold text-text-muted uppercase tracking-[0.2em]">External Orchestration</p>
                <a 
                    href="https://costinghub.com/wp-admin" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-black mt-2 block uppercase text-sm tracking-tighter"
                >
                    Launch WordPress CMS Center →
                </a>
            </div>
        </div>
      </Card>
    </div>
  );
};
