import React, { useState, useEffect } from 'react';
import type { Machine } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { MACHINE_TYPES, ADDITIONAL_AXIS_OPTIONS } from '../constants';
import { suggestMachine } from '../services/geminiService';

interface MachineModalProps {
  machine: Machine | null;
  onSave: (machine: Machine) => void;
  onClose: () => void;
}

const BLANK_MACHINE: Omit<Machine, 'id' | 'created_at' | 'user_id' | 'hourlyRate'> = {
  name: '',
  brand: '',
  model: '',
  machineType: 'CNC Mill',
  xAxis: 0,
  yAxis: 0,
  zAxis: 0,
  powerKw: 0,
  additionalAxis: 'None',
};

export const MachineModal: React.FC<MachineModalProps> = ({ machine, onSave, onClose }) => {
  const [formData, setFormData] = useState<Omit<Machine, 'id' | 'created_at' | 'user_id' | 'hourlyRate'>>(() => machine ? { ...machine } : BLANK_MACHINE);
  const [suggestionPrompt, setSuggestionPrompt] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');

  useEffect(() => {
    setFormData(machine ? { ...machine } : BLANK_MACHINE);
  }, [machine]);

  useEffect(() => {
    const newName = `${formData.brand} ${formData.model}`.trim();
    if (newName) {
        setFormData(prev => ({...prev, name: newName}));
    }
  }, [formData.brand, formData.model]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const type = (e.target as HTMLInputElement).type;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? (parseFloat(value) || 0) : value }));
  };

  const handleSuggestion = async () => {
    if (!suggestionPrompt) return;
    setIsSuggesting(true);
    setSuggestionError('');
    try {
        const suggestion = await suggestMachine(suggestionPrompt);
        if (suggestion) {
            setFormData(prev => ({ ...prev, ...suggestion }));
        } else {
            setSuggestionError('Could not generate a suggestion. Please try a different prompt.');
        }
    } catch (error) {
        console.error('Gemini suggestion failed:', error);
        setSuggestionError('An error occurred while getting suggestions.');
    } finally {
        setIsSuggesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const machineToSave: Machine = {
        id: machine?.id || new Date().toISOString() + Math.random(),
        hourlyRate: machine?.hourlyRate || 0, // Preserve existing rate, or default for new
        ...formData,
    };
    onSave(machineToSave);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="max-w-2xl w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
        <h2 className="text-2xl font-bold text-primary mb-6">{machine ? 'Edit Machine' : 'Add New Machine'}</h2>

        <div className="mb-6 p-4 border border-dashed border-primary/50 rounded-lg bg-primary/5">
            <h3 className="text-lg font-semibold text-primary mb-2">Suggest with AI</h3>
            <p className="text-sm text-text-secondary mb-3">Describe a machine, and let AI fill in the typical specifications for you.</p>
            <textarea
                value={suggestionPrompt}
                onChange={(e) => setSuggestionPrompt(e.target.value)}
                placeholder="e.g., 'a common 3-axis CNC mill like a Haas VF-2' or 'a large horizontal boring mill'"
                className="block w-full px-3 py-2 border rounded-md focus:outline-none sm:text-sm bg-background/50 text-text-input border-border placeholder-text-muted focus:ring-primary focus:border-primary"
                rows={2}
                disabled={isSuggesting}
            />
            <div className="mt-3 flex items-center justify-end">
                {suggestionError && <p className="text-sm text-red-500 mr-4">{suggestionError}</p>}
                <Button type="button" onClick={handleSuggestion} disabled={isSuggesting || !suggestionPrompt}>
                    {isSuggesting ? 'Suggesting...' : 'Suggest'}
                </Button>
            </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Brand" name="brand" value={formData.brand} onChange={handleInputChange} required />
              <Input label="Model" name="model" value={formData.model} onChange={handleInputChange} required />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Machine Name (Auto-generated)" name="name" value={formData.name} onChange={() => {}} disabled />
            </div>

            <Select label="Machine Type" name="machineType" value={formData.machineType} onChange={handleInputChange}>
              {MACHINE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </Select>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="X-Axis Travel" name="xAxis" type="number" step="any" value={formData.xAxis} onChange={handleInputChange} unit="mm" required />
              <Input label="Y-Axis Travel" name="yAxis" type="number" step="any" value={formData.yAxis} onChange={handleInputChange} unit="mm" required />
              <Input label="Z-Axis Travel" name="zAxis" type="number" step="any" value={formData.zAxis} onChange={handleInputChange} unit="mm" required />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Spindle Power" name="powerKw" type="number" step="any" value={formData.powerKw} onChange={handleInputChange} unit="kW" required />
              <Select label="Additional Axis" name="additionalAxis" value={formData.additionalAxis} onChange={handleInputChange}>
                {ADDITIONAL_AXIS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </Select>
            </div>

            <div className="flex justify-end space-x-4 mt-6 border-t border-border pt-4">
                <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
                <Button type="submit">Save Machine</Button>
            </div>
        </form>
      </Card>
    </div>
  );
};