import React from 'react';
import { ThemeToggle } from '../components/ThemeToggle';

interface PublicLayoutProps {
  children: React.ReactNode;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const Footer: React.FC = () => {
  return (
    <footer className="bg-background border-t border-border">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div>
                <h3 className="text-lg font-semibold text-primary">CostingHub</h3>
                <p className="mt-1 text-sm text-text-secondary">All Costs. One Hub.</p>
            </div>
          <p className="text-base text-text-muted text-center">&copy; 2025 CostingHub Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children, theme, setTheme }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
       <header className="bg-surface shadow-sm p-4 border-b border-border">
          <div className="w-full mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Costing<span className="text-primary">Hub</span></h1>
            </div>
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