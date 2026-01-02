
import React from 'react';
import { ThemeToggle } from '../components/ThemeToggle';

interface PublicLayoutProps {
  children: React.ReactNode;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const Footer: React.FC = () => {
  return (
    <footer className="bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col items-center md:items-start">
                <h3 className="text-lg font-bold text-text-primary">Costing<span className="text-primary">Hub</span></h3>
                <p className="mt-1 text-sm text-text-secondary">All Costs. One Hub.</p>
            </div>
            
            <div className="flex space-x-6">
                <a href="/" className="text-sm text-text-secondary hover:text-primary transition-colors">Home</a>
            </div>

            <p className="text-sm text-text-muted text-center">&copy; 2025 CostingHub Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children, theme, setTheme }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
       <header className="bg-surface shadow-sm p-4 border-b border-border">
          <div className="w-full max-w-7xl mx-auto flex justify-between items-center">
            <a href="https://www.costinghub.com" className="group block focus:outline-none">
              <h1 className="text-2xl font-bold text-text-primary group-hover:opacity-80 transition-opacity">Costing<span className="text-primary">Hub</span></h1>
              <p className="text-xs text-text-muted">All Costs. One Hub.</p>
            </a>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
      </header>
      <main className="flex-1 flex items-center justify-center">
        {children}
      </main>
      <Footer />
    </div>
  );
};
