import React, { useState } from 'react';
import type { Machine } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { suggestMultipleMachines } from '../services/geminiService';

type MachineSuggestion = Omit<Machine, 'id' | 'user_id' | 'created_at'>;

interface MultiMachineModalProps {
  onSave: (machines: MachineSuggestion[]) => void;
  onClose: () => void;
}

export const MultiMachineModal: React.FC<MultiMachineModalProps> = ({ onSave, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<MachineSuggestion[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setError('');
    setSuggestions([]);
    setSelectedIndices([]);
    try {
      const result = await suggestMultipleMachines(prompt);
      setSuggestions(result);
      setSelectedIndices(result.map((_, index) => index));
    } catch (err) {
      console.error('Gemini suggestion failed:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleSelection = (index: number) => {
    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };
  
  const handleToggleSelectAll = () => {
    if (selectedIndices.length === suggestions.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(suggestions.map((_, index) => index));
    }
  };

  const handleSave = () => {
    const selectedItems = suggestions.filter((_, index) => selectedIndices.includes(index));
    onSave(selectedItems);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="max-w-3xl w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="text-2xl font-bold text-primary mb-4">Add Multiple Machines with AI</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'A Haas VF-2, a Doosan Puma lathe, and an Amada bandsaw'"
              className="block w-full px-3 py-2 border rounded-md focus:outline-none sm:text-sm bg-background/50 text-text-input border-border placeholder-text-muted focus:ring-primary focus:border-primary"
              rows={3}
              disabled={isGenerating}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={isGenerating || !prompt}>
              {isGenerating ? 'Generating...' : 'Generate Suggestions'}
            </Button>
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          {suggestions.length > 0 && (
             <div className="space-y-2 max-h-80 overflow-y-auto border border-border rounded-lg p-2">
              <div className="flex items-center p-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary"
                  checked={selectedIndices.length === suggestions.length}
                  onChange={handleToggleSelectAll}
                />
                <label className="ml-2 text-sm font-medium text-text-primary">Select All ({selectedIndices.length}/{suggestions.length})</label>
              </div>
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-background/50">
                    <tr>
                        <th className="px-4 py-2"></th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Type</th>
                    </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                    {suggestions.map((item, index) => (
                        <tr key={index} className={`hover:bg-background/60 ${selectedIndices.includes(index) ? 'bg-primary/10' : ''}`}>
                            <td className="px-4 py-2">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary"
                                    checked={selectedIndices.includes(index)}
                                    onChange={() => handleToggleSelection(index)}
                                />
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-text-primary">{item.name}</td>
                            <td className="px-4 py-2 text-sm text-text-secondary">{item.machineType}</td>
                        </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-4 mt-6 border-t border-border pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={selectedIndices.length === 0}>
            Save Selected ({selectedIndices.length})
          </Button>
        </div>
      </Card>
    </div>
  );
};