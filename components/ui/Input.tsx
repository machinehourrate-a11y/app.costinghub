import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  unit?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, unit, id, error, ...props }) => {
  const inputId = id || `input-${props.name}`;
  const errorClasses = error 
    ? 'border-red-500 text-red-400 placeholder-red-700 focus:ring-red-500 focus:border-red-500' 
    : 'border-border placeholder-text-muted focus:ring-primary focus:border-primary focus:shadow-glow-primary';

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary mb-1">
        {label}
      </label>
      <div className="relative rounded-md shadow-sm">
        <input
          id={inputId}
          {...props}
          className={`block w-full px-3 py-2 border rounded-md focus:outline-none sm:text-sm bg-background/50 text-text-input disabled:bg-surface disabled:text-text-muted transition-all duration-200 ${errorClasses}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        {unit && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-text-muted sm:text-sm">{unit}</span>
          </div>
        )}
      </div>
      {error && <p id={`${inputId}-error`} className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};