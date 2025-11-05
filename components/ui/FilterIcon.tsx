
import React from 'react';

interface FilterIconProps {
  isActive: boolean;
}

export const FilterIcon: React.FC<FilterIconProps> = ({ isActive }) => (
  <svg 
    className={`h-4 w-4 transition-colors ${isActive ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`} 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 12.414V17a1 1 0 01-1.447.894l-3-2A1 1 0 017 15V12.414L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
  </svg>
);
