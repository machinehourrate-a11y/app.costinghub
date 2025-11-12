import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, id, children, error, ...props }) => {
  const selectId = id || `select-${props.name}`;
  const errorClasses = error
    ? 'border-red-500 text-red-400 focus:ring-red-500 focus:border-red-500'
    : 'border-border focus:ring-primary focus:border-primary focus:shadow-glow-primary';

  return (
    <div>
      <label htmlFor={selectId} className="block text-sm font-medium text-text-secondary mb-1">
        {label}
      </label>
      <select
        id={selectId}
        {...props}
        className={`block w-full pl-3 pr-10 py-2 text-base border focus:outline-none sm:text-sm rounded-md bg-background/50 text-text-input transition-all duration-200 ${errorClasses}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
      >
        {children}
      </select>
      {error && <p id={`${selectId}-error`} className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};