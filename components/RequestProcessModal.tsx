
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface RequestProcessModalProps {
  onClose: () => void;
  onSubmitRequest: (details: string) => void;
}

export const RequestProcessModal: React.FC<RequestProcessModalProps> = ({ onClose, onSubmitRequest }) => {
  const [details, setDetails] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (details.trim()) {
      onSubmitRequest(details.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="max-w-xl w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="text-2xl font-bold text-primary mb-4">Request a New Process</h2>
        <p className="text-text-secondary mb-6">
          Can't find the process you're looking for? Describe it below, and our team will review your request to add it to the library. Please be as detailed as possible.
        </p>
        <form onSubmit={handleSubmit}>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="e.g., 'A process for gear shaping, including parameters like face width, feed per stroke, and strokes per minute...'"
            className="block w-full px-3 py-2 border rounded-md focus:outline-none sm:text-sm bg-background/50 text-text-input border-border placeholder-text-muted focus:ring-primary focus:border-primary"
            rows={5}
            required
          />
          <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!details.trim()}>Submit Request</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
