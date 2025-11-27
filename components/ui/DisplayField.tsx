
import React from 'react';

export const DisplayField: React.FC<{ label: string; value: string | number | null | undefined | object; unit?: string; className?: string }> = ({ label, value, unit, className }) => {
  let displayValue = '';
  
  if (value === null || value === undefined) {
    displayValue = '';
  } else if (typeof value === 'object') {
    try {
      // Check if it's a React element or complex object and just show a placeholder or stringify safely
      // Note: '$$typeof' check is internal React, but generally safe to avoid rendering objects directly
      if ('$$typeof' in value) {
          displayValue = '[React Element]';
      } else {
          displayValue = JSON.stringify(value);
      }
    } catch (e) {
      displayValue = '[Object]';
    }
  } else {
    displayValue = String(value);
  }
  
  return (
    <div className={className}>
        <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <div className="mt-1 flex h-10 items-center rounded-md border border-border bg-background/50 px-3 text-sm shadow-sm truncate">
        <span className="text-text-primary font-medium truncate" title={displayValue}>{displayValue}</span>
        {unit && <span className="ml-2 text-text-muted flex-shrink-0">{unit}</span>}
        </div>
    </div>
  );
};
