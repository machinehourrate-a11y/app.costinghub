
import React, { useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CloseIcon } from './ui/CloseIcon';

interface FilterPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

export const FilterPopover: React.FC<FilterPopoverProps> = ({ anchorEl, onClose, children, title }) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!anchorEl) return null;

  const rect = anchorEl.getBoundingClientRect();
  const style = {
    position: 'absolute' as const,
    top: `${rect.bottom + window.scrollY + 8}px`,
    left: `${rect.left + window.scrollX}px`,
  };

  const popoverContent = (
    <div 
      ref={popoverRef} 
      style={style} 
      className="z-50 w-64 bg-surface border border-border rounded-lg shadow-2xl p-4 animate-fade-in"
      onClick={e => e.stopPropagation()} // Prevent clicks inside from closing the popover
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-semibold text-text-primary">{title}</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary"><CloseIcon /></button>
      </div>
      <div>{children}</div>
    </div>
  );

  return ReactDOM.createPortal(popoverContent, document.body);
};
