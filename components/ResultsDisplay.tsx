import React from 'react';
import type { MachiningResult } from '../types';

interface ResultsDisplayProps {
  results: MachiningResult | null;
  currency: string;
}

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(value);
  } catch (e) {
    console.error("Invalid currency code:", currency);
    return `$${value.toFixed(2)}`; // Fallback to USD
  }
};

const formatNumber = (value: number, digits: number = 2) => {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
};

const ResultRow: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = '' }) => (
  <div className={`flex justify-between items-center py-3 px-4 rounded-lg ${className}`}>
    <span className="text-text-secondary">{label}</span>
    <span className="font-semibold text-text-primary">{value}</span>
  </div>
);

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, currency }) => {
  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary p-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-text-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="font-semibold text-primary">No Results</h3>
          <p>Calculation data could not be loaded.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-2">Material & Weight</h3>
        <div className="bg-surface rounded-lg p-2 space-y-1">
           <ResultRow label="Raw Material Weight" value={`${formatNumber(results.rawMaterialWeightKg, 3)} kg`} className="bg-background/50"/>
           <ResultRow label="Finished Part Weight" value={`${formatNumber(results.finishedPartWeightKg, 3)} kg`} className=""/>
           <ResultRow label="Raw Material Cost / Part" value={formatCurrency(results.rawMaterialPartCost, currency)} className="bg-background/50 font-semibold" />
           <ResultRow label="Material Cost (Total Batch)" value={formatCurrency(results.materialCost, currency)} className=""/>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-primary mb-2">Time Analysis</h3>
        <div className="bg-surface rounded-lg p-2 space-y-1">
           <ResultRow label="Total Cutting Time" value={`${formatNumber(results.totalCuttingTimeMin)} min`} className="bg-background/50"/>
           <ResultRow label="Total Setup Time" value={`${formatNumber(results.totalSetupTimeMin)} min`} className=""/>
           <ResultRow label="Total Tool Change Time" value={`${formatNumber(results.totalToolChangeTimeMin)} min`} className="bg-background/50"/>
           <ResultRow label="Cycle Time / Part" value={`${formatNumber(results.cycleTimePerPartMin)} min`} className=""/>
           <ResultRow label="Total Machine Time" value={`${formatNumber(results.totalMachineTimeHours)} hrs`} className="bg-background/50"/>
        </div>
      </div>

      {results.operationTimeBreakdown.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-primary mb-2 ml-1">Operation Breakdown</h4>
          <div className="bg-surface rounded-lg p-2 space-y-1 text-sm">
              {results.operationTimeBreakdown.map((op, index) => (
                  <div key={op.id} className={`flex justify-between items-center py-2 px-4 rounded-md ${index % 2 === 0 ? 'bg-background/50' : ''}`}>
                      <span className="text-text-secondary">{op.machineName ? `[${op.machineName}] ` : ''}{op.processName}</span>
                      <span className="font-medium text-text-primary">{formatNumber(op.timeMin)} min</span>
                  </div>
              ))}
          </div>
        </div>
      )}

      <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Cost Breakdown (Total Batch)</h3>
           <div className="bg-surface rounded-lg p-2 space-y-1">
              <ResultRow label="Machine Cost" value={formatCurrency(results.machineCost, currency)} className="bg-background/50"/>
              <ResultRow label="Labor Cost" value={formatCurrency(results.laborCost, currency)} className=""/>
              <ResultRow label="Overhead Cost" value={formatCurrency(results.overheadCost, currency)} className="bg-background/50"/>
           </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-primary mb-2">Summary</h3>
        <div className="bg-surface rounded-lg p-2 space-y-1">
          <ResultRow label="Total Batch Cost" value={formatCurrency(results.totalCost, currency)} className="bg-background/50"/>
          <ResultRow label="Cost / Part" value={formatCurrency(results.costPerPart, currency)} className="bg-green-600 !text-white font-bold mt-2 pt-4 border-t border-border" />
        </div>
      </div>
    </div>
  );
};
