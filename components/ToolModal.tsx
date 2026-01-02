import React, { useState, useEffect, useMemo } from 'react';
import type { Tool } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { TOOL_TYPES, TOOL_MATERIALS, ARBOR_OR_INSERT_OPTIONS, DEFAULT_TOOL_NAMES } from '../constants';
import { suggestTool, calculateToolLife } from '../services/geminiService';

interface ToolModalProps {
  tool: Tool | null;
  onSave: (tool: Tool) => void;
  onClose: () => void;
  currency: string;
  isSuperAdmin: boolean;
}

const BLANK_TOOL: Omit<Tool, 'id' | 'created_at' | 'user_id' | 'price'> = {
  name: '',
  brand: '',
  model: '',
  toolType: TOOL_TYPES[0],
  material: TOOL_MATERIALS[0],
  diameter: 10,
  cornerRadius: null,
  numberOfTeeth: 4,
  arborOrInsert: 'Shank',
  compatibleMachineTypes: [],
  cuttingSpeedVc: null,
  feedPerTooth: null,
  speedRpm: null,
  feedRate: null,
  estimatedLife: null,
};

export const ToolModal: React.FC<ToolModalProps> = ({ tool, onSave, onClose, currency, isSuperAdmin }) => {
  const [formData, setFormData] = useState<Omit<Tool, 'id' | 'created_at' | 'user_id' | 'price'>>(() => tool ? { ...tool } : BLANK_TOOL);
  const [suggestionPrompt, setSuggestionPrompt] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const [isCalculatingLife, setIsCalculatingLife] = useState(false);

  const isDefault = useMemo(() => tool ? DEFAULT_TOOL_NAMES.has(tool.name) : false, [tool]);

  useEffect(() => {
    setFormData(tool ? { ...tool } : BLANK_TOOL);
  }, [tool]);
  
  // Auto-calculation and auto-naming effect
  useEffect(() => {
    const { brand, model, diameter, toolType, material, cuttingSpeedVc, feedPerTooth, numberOfTeeth } = formData;
    
    // Do not auto-generate name if it's a default item being edited by an admin
    if (!(isSuperAdmin && isDefault)) {
      const newName = `${brand} ${model} ${diameter || ''}mm ${toolType}`.trim().replace(/\s+/g, ' ');
       setFormData(prev => ({...prev, name: newName}));
    }

    let newRpm: number | null = null;
    let newFeedRate: number | null = null;
    
    if (cuttingSpeedVc && diameter > 0) {
      newRpm = Math.round((cuttingSpeedVc * 1000) / (Math.PI * diameter));
    }

    if (newRpm && feedPerTooth && numberOfTeeth) {
      newFeedRate = Math.round(newRpm * feedPerTooth * numberOfTeeth);
    }
    
    setFormData(prev => ({
        ...prev,
        speedRpm: newRpm,
        feedRate: newFeedRate
    }));

  }, [formData.brand, formData.model, formData.diameter, formData.toolType, formData.material, formData.cuttingSpeedVc, formData.feedPerTooth, formData.numberOfTeeth, isSuperAdmin, isDefault]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const type = (e.target as HTMLInputElement).type;
    
    if (type === 'number') {
      const isNullable = ['cornerRadius', 'cuttingSpeedVc', 'feedPerTooth', 'numberOfTeeth', 'estimatedLife'].includes(name);
      if (value === '') {
        setFormData(prev => ({ ...prev, [name]: isNullable ? null : 0 }));
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          let finalValue = numValue;
          // For fields that are integers in the DB, round the value.
          if (name === 'numberOfTeeth' || name === 'estimatedLife') {
            finalValue = Math.round(numValue);
          }
          setFormData(prev => ({ ...prev, [name]: finalValue }));
        }
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSuggestion = async () => {
    if (!suggestionPrompt) return;
    setIsSuggesting(true);
    setSuggestionError('');
    try {
        const suggestion = await suggestTool(suggestionPrompt);
        setFormData(prev => ({ ...prev, ...suggestion }));
    } catch (error) {
        console.error('Gemini suggestion failed:', error);
        setSuggestionError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
        setIsSuggesting(false);
    }
  };

  const handleCalculateLife = async () => {
    setIsCalculatingLife(true);
    try {
      const life = await calculateToolLife(formData);
      setFormData(prev => ({ ...prev, estimatedLife: life }));
    } catch (error) {
        console.error("Failed to calculate tool life.", error);
        alert(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsCalculatingLife(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const toolToSave: Tool = {
        id: tool?.id || new Date().toISOString() + Math.random(),
        price: tool?.price || null, // Preserve existing price, or default for new
        ...formData,
    };
    onSave(toolToSave);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="max-w-2xl w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
        <h2 className="text-2xl font-bold text-primary mb-6">{tool ? 'Edit Tool' : 'Add New Tool'}</h2>
        
        <div className="mb-6 p-4 border border-dashed border-primary/50 rounded-lg bg-primary/5">
            <h3 className="text-lg font-semibold text-primary mb-2">Suggest with AI</h3>
            <p className="text-sm text-text-secondary mb-3">Describe a tool, and AI will suggest its properties and cutting parameters.</p>
            <textarea
                value={suggestionPrompt}
                onChange={(e) => setSuggestionPrompt(e.target.value)}
                placeholder="e.g., 'a 10mm carbide endmill for aluminum' or 'a HSS drill bit for steel'"
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
            
            <h3 className="text-lg font-semibold text-primary border-t border-border pt-4">Tool Definition</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Brand" 
                  name="brand" 
                  value={formData.brand} 
                  onChange={handleInputChange} 
                  disabled={isSuperAdmin && isDefault}
                  title={isSuperAdmin && isDefault ? "Brand/Model cannot be changed for default items to maintain data integrity." : ""}
                />
                <Input 
                  label="Model" 
                  name="model" 
                  value={formData.model} 
                  onChange={handleInputChange} 
                  disabled={isSuperAdmin && isDefault}
                  title={isSuperAdmin && isDefault ? "Brand/Model cannot be changed for default items to maintain data integrity." : ""}
                />
            </div>
            <Input label="Tool Name (Auto-generated)" name="name" value={formData.name} onChange={() => {}} disabled />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Tool Type" name="toolType" value={formData.toolType} onChange={handleInputChange}>
                    {TOOL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </Select>
                 <Select label="Tool Material" name="material" value={formData.material} onChange={handleInputChange}>
                    {TOOL_MATERIALS.map(type => <option key={type} value={type}>{type}</option>)}
                </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Diameter" name="diameter" type="number" step="any" value={formData.diameter} onChange={handleInputChange} unit="mm" required />
              <Input label="Corner Radius" name="cornerRadius" type="number" step="any" value={formData.cornerRadius ?? ''} onChange={handleInputChange} unit="mm" />
              <Input label="No. of Teeth" name="numberOfTeeth" type="number" value={formData.numberOfTeeth ?? ''} onChange={handleInputChange} />
               <Select label="Mount" name="arborOrInsert" value={formData.arborOrInsert} onChange={handleInputChange}>
                    {ARBOR_OR_INSERT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </Select>
            </div>
            
            <h3 className="text-lg font-semibold text-primary mt-4 border-t border-border pt-4">Commercial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Estimated Life</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-grow">
                      <Input
                        label=""
                        name="estimatedLife"
                        type="number"
                        step="any"
                        value={formData.estimatedLife ?? ''}
                        onChange={handleInputChange}
                        unit="hours"
                        placeholder="e.g., 50"
                      />
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCalculateLife}
                        disabled={isCalculatingLife}
                        className="!py-2.5 h-10"
                        title="Calculate with AI"
                      >
                        {isCalculatingLife ? (
                           <svg className="animate-spin h-5 w-5 text-text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                        ) : 'AI Calc'}
                    </Button>
                  </div>
                </div>
            </div>

            <h3 className="text-lg font-semibold text-primary mt-4 border-t border-border pt-4">Cutting Parameters (Inputs)</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Cutting Speed (Vc)" name="cuttingSpeedVc" type="number" step="any" value={formData.cuttingSpeedVc ?? ''} onChange={handleInputChange} unit="m/min" placeholder="e.g., 120" />
                <Input label="Feed per Tooth" name="feedPerTooth" type="number" step="any" value={formData.feedPerTooth ?? ''} onChange={handleInputChange} unit="mm" placeholder="e.g., 0.05" />
            </div>

            <h3 className="text-lg font-semibold text-primary mt-4 border-t border-border pt-4">Calculated Values</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Speed" name="speedRpm" type="number" value={formData.speedRpm ?? ''} onChange={() => {}} unit="RPM" disabled />
                <Input label="Feed Rate" name="feedRate" type="number" value={formData.feedRate ?? ''} onChange={() => {}} unit="mm/min" disabled />
            </div>

            <div className="flex justify-end space-x-4 mt-6 border-t border-border pt-4">
                <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
                <Button type="submit">Save Tool</Button>
            </div>
        </form>
      </Card>
    </div>
  );
};