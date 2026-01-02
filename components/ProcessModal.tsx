import React, { useState, useEffect, useMemo } from 'react';
import type { Process, ProcessParameter } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { MACHINE_TYPES, DEFAULT_PROCESS_NAMES } from '../constants';
import { suggestProcess } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';

interface ProcessModalProps {
  process: Process | null;
  onSave: (process: Process) => void;
  onClose: () => void;
  isSuperAdmin: boolean;
}

const BLANK_PROCESS: Omit<Process, 'id'> = {
  name: '',
  group: '',
  compatibleMachineTypes: [],
  parameters: [],
  formula: '',
  imageUrl: '',
};

const uuid = () => `id_${Math.random().toString(36).substring(2, 9)}`;

export const ProcessModal: React.FC<ProcessModalProps> = ({ process, onSave, onClose, isSuperAdmin }) => {
  const [formData, setFormData] = useState<Omit<Process, 'id'>>(() => process || BLANK_PROCESS);
  const [suggestionPrompt, setSuggestionPrompt] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const isDefault = useMemo(() => process ? DEFAULT_PROCESS_NAMES.has(process.name) : false, [process]);

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
        setFormData(suggestion as Omit<Process, 'id'>);
    } catch (error) {
        console.error('Gemini suggestion failed:', error);
        setSuggestionError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
        setIsSuggesting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuid()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Attempt initial upload
        let { error: uploadError } = await supabase.storage
            .from('process_images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        // Auto-create bucket if it doesn't exist
        if (uploadError && (uploadError.message.includes('Bucket not found') || (uploadError as any).statusCode === '404')) {
            const { error: createError } = await supabase.storage.createBucket('process_images', {
                public: true, // Public access is required to display images.
                fileSizeLimit: 2097152, // 2MB limit for performance
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'] // For security
            });
            
            // If createError exists AND it's not a "bucket already exists" error, then it's a real issue.
            if (createError && !createError.message.includes('The resource already exists')) {
                throw new Error(`Failed to auto-create storage bucket 'process_images'. Please check Supabase permissions. Original error: ${createError.message}`);
            }

            // Whether bucket creation succeeded or it already existed, retry the upload.
            const retryResult = await supabase.storage
                .from('process_images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            uploadError = retryResult.error;
        }

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('process_images')
            .getPublicUrl(filePath);

        if (data.publicUrl) {
            setFormData(prev => ({ ...prev, imageUrl: data.publicUrl }));
        }
    } catch (error: any) {
        console.error('Upload failed:', error.message);
        alert(`Upload failed: ${error.message}`);
    } finally {
        setIsUploading(false);
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
        
        {isSuperAdmin && (
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
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Process Name" 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange} 
                required 
                disabled={isSuperAdmin && isDefault}
                title={isSuperAdmin && isDefault ? "The name of a default process cannot be changed." : ""}
              />
              <Input label="Process Group" name="group" value={formData.group} onChange={handleInputChange} required />
            </div>
            
            <div className="col-span-full bg-background/30 p-4 rounded-lg border border-border">
                <label className="block text-sm font-medium text-text-secondary mb-3">
                    Process Illustration 
                    {isSuperAdmin && <span className="text-primary text-xs ml-2 font-bold uppercase tracking-wider">(Admin: Global Update Enabled)</span>}
                </label>
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="h-32 w-40 flex-shrink-0 bg-white border border-border rounded-md flex items-center justify-center overflow-hidden relative group">
                        {formData.imageUrl ? (
                            <>
                                <img src={formData.imageUrl} alt="Preview" className="h-full w-full object-contain p-2" />
                                {isSuperAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                                        title="Remove Image"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-text-muted">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs">No Image</span>
                            </div>
                        )}
                    </div>
                    {isSuperAdmin ? (
                        <div className="flex-1 w-full space-y-4">
                            <p className="text-xs text-text-muted">
                                Upload a clear schematic or photo of the process. This image will be visible to all users if this is a default process.
                            </p>
                            <div className="flex items-center gap-3">
                                <label className={`cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>
                                    {isUploading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload New Image
                                        </>
                                    )}
                                    <input type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                                </label>
                                <span className="text-xs text-text-secondary">Supported: JPG, PNG, SVG</span>
                            </div>
                            <div className="relative py-1">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-border"></div>
                                </div>
                                <div className="relative flex justify-start">
                                    <span className="pr-2 bg-transparent text-xs text-text-muted">OR</span>
                                </div>
                            </div>
                            <Input 
                                label="Image URL" 
                                name="imageUrl" 
                                value={formData.imageUrl || ''} 
                                onChange={handleInputChange} 
                                placeholder="https://example.com/image.png" 
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center">
                            <p className="text-sm text-text-muted italic">Only Super Admins can update process illustrations.</p>
                        </div>
                    )}
                </div>
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
                    <p className="text-xs text-text-muted mt-2">You can use standard JavaScript `Math` functions like `Math.ceil()`, `Math.PI`, etc.</p>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-primary mt-4 border-t border-border pt-4">Implicit Formula Parameters</h3>
                <p className="text-sm text-text-muted mt-2 mb-3">These variables are automatically available to your formula based on the selected tool.</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 rounded bg-background/50">
                    <code className="font-mono text-text-primary">toolDiameter</code>
                    <span className="text-text-secondary">From selected tool's 'Diameter' (mm)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-background/50">
                    <code className="font-mono text-text-primary">feedRate</code>
                    <span className="text-text-secondary">Calculated from tool data (mm/min)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-background/50">
                    <code className="font-mono text-text-primary">spindleSpeed</code>
                    <span className="text-text-secondary">Calculated from tool data (RPM)</span>
                  </div>
                </div>
            </div>

          </div>
          <div className="flex justify-end space-x-4 mt-6 border-t border-border pt-6">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isUploading}>Save Process</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};