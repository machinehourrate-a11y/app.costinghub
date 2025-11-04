

import React from 'react';
import type { ResultsPageProps } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ResultsDisplay } from '../components/ResultsDisplay';

export const ResultsPage: React.FC<ResultsPageProps> = ({ calculation, onBack, user }) => {
  const currency = user.currency || 'USD';

  if (!calculation || !calculation.results) {
    return (
       <div className="min-h-screen bg-background flex flex-col p-4 sm:p-6 lg:p-8 animate-fade-in items-center justify-center text-center">
         <Card>
           <h1 className="text-2xl font-bold text-primary mb-4">No Results Available</h1>
           <p className="text-text-secondary mb-6">
            {
              !calculation
                ? "The selected calculation could not be loaded."
                : "This is a draft calculation and does not have any results yet. Please edit the calculation and finalize it to see the results."
            }
           </p>
           <Button onClick={onBack}>Back to Calculations</Button>
         </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in">
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
            <ResultsDisplay results={calculation.results} currency={currency} />
        </Card>
    </div>
  );
};
