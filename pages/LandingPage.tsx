import React from 'react';
import type { View } from '../types';
import { Card } from '../components/ui/Card';

interface LandingPageProps {
  onNavigate: (view: View) => void;
  userName: string;
}

const Icons = {
    Machining: <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m12 0a2 2 0 100-4m0 4a2 2 0 110-4M6 12a2 2 0 100-4m0 4a2 2 0 110-4m12 0a2 2 0 100-4m0 4a2 2 0 110-4M6 18a2 2 0 100-4m0 4a2 2 0 110-4m12 0a2 2 0 100-4m0 4a2 2 0 110-4" /></svg>,
    SandCasting: <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    InvestmentCasting: <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 009-9M3 12a9 9 0 019-9m-9 9h18" /></svg>,
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, userName }) => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in text-center">
      <h1 className="text-4xl font-bold text-primary">Welcome, {userName}!</h1>
      <p className="text-xl text-text-secondary">Please select a calculator to get started.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
        {/* Card 1: Machining (Active) */}
        <div 
          className="transform hover:-translate-y-2 transition-transform duration-300 cursor-pointer"
          onClick={() => onNavigate('calculations')}
          role="button"
          tabIndex={0}
          aria-label="Open Machining Part Cost Calculator"
        >
          <Card className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-primary hover:shadow-glow-primary">
            {Icons.Machining}
            <h2 className="text-2xl font-bold mt-4">Machining Cost Calculator</h2>
            <p className="text-text-secondary mt-2 flex-grow">Detailed cost and cycle time analysis for machined parts.</p>
          </Card>
        </div>

        {/* Card 2: Sand Casting (Under Construction) */}
        <div className="relative">
          <Card className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50 grayscale">
            {Icons.SandCasting}
            <h2 className="text-2xl font-bold mt-4">Sand Casting Cost Calculator</h2>
            <p className="text-text-secondary mt-2 flex-grow">Estimate costs for sand-casted components.</p>
          </Card>
          <div className="absolute top-4 right-4 bg-yellow-500 text-black text-xs font-bold uppercase px-2 py-1 rounded">
            Coming Soon
          </div>
        </div>

        {/* Card 3: Investment Casting (Under Construction) */}
         <div className="relative">
          <Card className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50 grayscale">
            {Icons.InvestmentCasting}
            <h2 className="text-2xl font-bold mt-4">Investment Casting Cost Calculator</h2>
            <p className="text-text-secondary mt-2 flex-grow">Analyze costs for precision investment castings.</p>
          </Card>
          <div className="absolute top-4 right-4 bg-yellow-500 text-black text-xs font-bold uppercase px-2 py-1 rounded">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
};
