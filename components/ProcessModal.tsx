import React, { useState, useEffect } from 'react';
import type { Process, ProcessParameter } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { MACHINE_TYPES } from '../constants';
import { suggestProcess } from '../services/geminiService';

interface ProcessModalProps {
  process: Process | null;
  onSave: (process: Process) => void;
  onClose: () => void;
}

const BLANK_PROCESS: Omit<Process, 'id'> = {
  name: '',
  group: '',
  compatibleMachineTypes: [],
  parameters: [],
  formula: '',
};

const uuid = () => `id_${Math.random().toString(36).substring(2, 9)}`;

export const ProcessModal: React.FC<ProcessModalProps> = ({ process, onSave, onClose }) => {
  const [formData, setFormData] = useState<Omit<Process, 'id'>>(() => process || BLANK_PROCESS);
  const [suggestionPrompt, setSuggestionPrompt] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');

  useEffect(() => {
    setFormData(process || BLANK_PROCESS);
  }, [process]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMachineTypeChange = (machineType: string) => {
    setFormData(prev => {
        const newTypes = prev.compatibleMachineTypes.includes(machineType)
            ? prev.compatibleMachineTypes.filter(t => t !== machineType)
            : [...prev.compatibleMachineTypes, machineType];
        return { ...prev, compatibleMachineTypes: newTypes };
    });
  };

  const handleParameterChange = (index: number, field: keyof ProcessParameter, value: string) => {
    setFormData(prev => {
        const newParams = [...(prev.parameters as unknown as ProcessParameter[])];
        newParams[index] = { ...newParams[index], [field]: value };
        return { ...prev, parameters: newParams as any };
    });
  };

  const addParameter = () => {
    setFormData(prev => ({
        ...prev,
        parameters: [...(prev.parameters as unknown as ProcessParameter[]), { name: '', label: '', unit: '' }] as any
    }));
  };

  const removeParameter = (index: number) => {
    setFormData(prev => ({
        ...prev,
        parameters: (prev.parameters as unknown as ProcessParameter[]).filter((_, i) => i !== index) as any
    }));
  };

  const handleSuggestion = async () => {
    if (!suggestionPrompt) return;
    setIsSuggesting(true);
    setSuggestionError('');
    try {
        const suggestion = await suggestProcess(suggestionPrompt);
        if (suggestion) {
            setFormData(suggestion as Omit<Process, 'id'>);
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
    const processToSave: Process = {
        id: process?.id || uuid(),
        ...formData,
    };
    onSave(processToSave);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="max-w-3xl w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="text-2xl font-bold text-primary mb-6">{process ? 'Edit Process' : 'Add New Process'}</h2>
        
        <div className="mb-6 p-4 border border-dashed border-primary/50 rounded-lg bg-primary/5">
            <h3 className="text-lg font-semibold text-primary mb-2">Suggest with AI</h3>
            <p className="text-sm text-text-secondary mb-3">Describe a manufacturing process, and AI will suggest a name, group, and its parameters.</p>
            <textarea
                value={suggestionPrompt}
                onChange={(e) => setSuggestionPrompt(e.target.value)}
                placeholder="e.g., 'a process for face milling a block of steel' or 'cylindrical grinding'"
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
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Process Name" name="name" value={formData.name} onChange={handleInputChange} required />
              <Input label="Process Group" name="group" value={formData.group} onChange={handleInputChange} required />
            </div>

            <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Compatible Machine Types</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 border border-border rounded-md">
                    {MACHINE_TYPES.map(type => (
                        <label key={type} className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary"
                                checked={formData.compatibleMachineTypes.includes(type)}
                                onChange={() => handleMachineTypeChange(type)}
                            />
                            <span className="text-sm text-text-primary">{type}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-primary mt-4 border-t border-border pt-4">Calculation Parameters</h3>
                <div className="space-y-2 mt-2">
                    {(formData.parameters as unknown as ProcessParameter[]).map((param, index) => (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-background/50 p-2 rounded">
                            <Input label="Name (code)" value={param.name} onChange={e => handleParameterChange(index, 'name', e.target.value)} placeholder="e.g., lengthOfCut" />
                            <Input label="Display Label" value={param.label} onChange={e => handleParameterChange(index, 'label', e.target.value)} placeholder="e.g., Length of Cut" />
                            <Input label="Unit" value={param.unit} onChange={e => handleParameterChange(index, 'unit', e.target.value)} placeholder="e.g., mm" />
                            <Button type="button" variant="secondary" onClick={() => removeParameter(index)} className="self-end text-red-500">
                                Remove
                            </Button>
                        </div>
                    ))}
                </div>
                 <Button type="button" variant="secondary" onClick={addParameter} className="mt-2">+ Add Parameter</Button>
            </div>
             <div>
                <h3 className="text-lg font-semibold text-primary mt-4 border-t border-border pt-4">Time Calculation Formula</h3>
                <div className="mt-2">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Formula (in minutes)</label>
                    <textarea
                        name="formula"
                        value={formData.formula || ''}
                        onChange={handleInputChange}
                        rows={4}
                        className="block w-full px-3 py-2 border rounded-md focus:outline-none sm:text-sm bg-background/50 text-text-input border-border placeholder-text-muted focus:ring-primary focus:border-primary font-mono"
                        placeholder="e.g., (machinedLength * machinedWidth) / feedRate"
                    />
                </div>
                <div className="mt-2">
                    <p className="text-xs text-text-muted">Available parameters (click to copy):</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {(formData.parameters as unknown as ProcessParameter[]).map(p => p.name && (
                            <button
                                type="button"
                                key={p.name}
                                onClick={() => navigator.clipboard.writeText(p.name)}
                                title={`Click to copy "${p.name}"`}
                                className="px-2 py-1 text-xs bg-surface border border-border rounded-md hover:bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                            >
                                {p.name}
                            </button>
                        ))}
                        {(formData.parameters as unknown as ProcessParameter[]).length === 0 && <span className="text-xs text-text-muted italic">No parameters defined yet.</span>}
                    </div>
                    <p className="text-xs text-text-muted mt-2">You can use standard JavaScript `Math` functions like `Math.ceil()`, `Math.floor()`, `Math.PI`, etc.</p>
                </div>
            </div>
          </div>
          <div className="flex justify-end space-x-4 mt-6 border-t border-border pt-6">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Process</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};