import React, { useState } from 'react';
import type { ResultsPageProps } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ResultsDisplay } from '../components/ResultsDisplay';
import { QuoteModal } from '../components/QuoteModal';

export const ResultsPage: React.FC<ResultsPageProps> = ({ calculation, onBack, user, onUpgrade }) => {
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  if (!calculation || !calculation.results) {
    return (
       <div className="w-full max-w-4xl mx-auto animate-fade-in">
         <div className="mb-6">
            <Button variant="secondary" onClick={onBack}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Calculations
            </Button>
         </div>
         <Card className="text-center">
           <h1 className="text-2xl font-bold text-primary mb-4">No Results Available</h1>
           <p className="text-text-secondary mb-6">
            {
              !calculation
                ? "The selected calculation could not be loaded."
                : "This is a draft calculation and does not have any results yet. Please edit the calculation and finalize it to see the results."
            }
           </p>
         </Card>
      </div>
    );
  }
  
  const currency = calculation.inputs.currency || 'USD';

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in">
        <div className="mb-6 flex justify-between items-center">
            <Button variant="secondary" onClick={onBack}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Calculations
            </Button>
            <Button onClick={() => setIsQuoteModalOpen(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Quote
            </Button>
        </div>
        <div className="mb-4 bg-surface shadow rounded-lg p-4 flex justify-between items-center border border-border">
             <div>
                <h1 className="text-3xl font-bold text-primary">Results for {calculation.inputs.partName}</h1>
                <p className="text-text-secondary">Part No: {calculation.inputs.partNumber} | Batch Volume: {calculation.inputs.batchVolume}</p>
             </div>
             <div className="text-right">
                <p className="text-3xl font-bold text-primary">{new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(calculation.results.costPerPart)}</p>
                <p className="text-text-secondary">Cost Per Part</p>
             </div>
        </div>
        <Card>
            <ResultsDisplay 
              results={calculation.results} 
              currency={currency} 
              markups={calculation.inputs.markups}
            />
        </Card>

        {isQuoteModalOpen && (
            <QuoteModal
                calculation={calculation}
                user={user}
                onClose={() => setIsQuoteModalOpen(false)}
                onUpgrade={onUpgrade}
            />
        )}
    </div>
  );
};
