import React from 'react';

export const DisplayField: React.FC<{ label: string; value: string | number; unit?: string; className?: string }> = ({ label, value, unit, className }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
    <div className="mt-1 flex h-10 items-center rounded-md border border-border bg-background/50 px-3 text-sm shadow-sm truncate">
      <span className="text-text-primary font-medium truncate">{value}</span>
      {unit && <span className="ml-2 text-text-muted flex-shrink-0">{unit}</span>}
    </div>
  </div>
);
