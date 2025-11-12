import React, { useState, useEffect, useMemo } from 'react';
import type { MaterialMasterItem, MaterialProperty } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { suggestMaterial } from '../services/geminiService';

interface MaterialModalProps {
  material: MaterialMasterItem | null;
  onSave: (material: MaterialMasterItem) => void;
  onClose: () => void;
  allProperties: string[];
}

const BLANK_MATERIAL: Omit<MaterialMasterItem, 'id'> = {
  name: '',
  category: 'Other',
  subCategory: '',
  properties: {},
};

const PropertyInput: React.FC<{
    propName: string;
    value: MaterialProperty | undefined;
    onChange: (propName: string, field: 'value' | 'unit', value: string) => void;
    unit: string;
    isNumeric?: boolean;
}> = ({ propName, value, onChange, unit, isNumeric = true }) => (
    <Input
        label={propName}
        type={isNumeric ? "number" : "text"}
        step={isNumeric ? "any" : undefined}
        value={value?.value ?? ''}
        onChange={(e) => onChange(propName, 'value', e.target.value)}
        unit={unit}
    />
);

export const MaterialModal: React.FC<MaterialModalProps> = ({ material, onSave, onClose, allProperties }) => {
  const [formData, setFormData] = useState<Omit<MaterialMasterItem, 'id'>>(() => material || BLANK_MATERIAL);
  const [newPropName, setNewPropName] = useState('');
  const [newPropValue, setNewPropValue] = useState('');
  const [newPropUnit, setNewPropUnit] = useState('');
  const [suggestionPrompt, setSuggestionPrompt] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');

  useEffect(() => {
    setFormData(material || BLANK_MATERIAL);
  }, [material]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePropertyChange = (propName: string, field: 'value' | 'unit', value: string) => {
    setFormData(prev => {
        let finalValue: string | number | null = value;
        if (field === 'value') {
            if (value === '') {
                finalValue = null;
            } else {
                const numValue = parseFloat(value);
                finalValue = isNaN(numValue) ? value : numValue;
            }
        }
        
        const newProperties = { ...(prev.properties as object) };
        const currentProp = (newProperties as any)[propName] || {};
        
        const updatedProp = { ...currentProp, [field]: finalValue };

        if ((updatedProp.value === null || updatedProp.value === '') && (updatedProp.unit === null || updatedProp.unit === '')) {
            delete (newProperties as any)[propName];
        } else {
            (newProperties as any)[propName] = updatedProp;
        }

        return { ...prev, properties: newProperties };
    });
  };

  const handleAddNewProperty = () => {
    if (newPropName && newPropValue) {
        handlePropertyChange(newPropName, 'value', newPropValue);
        handlePropertyChange(newPropName, 'unit', newPropUnit);
        setNewPropName('');
        setNewPropValue('');
        setNewPropUnit('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const materialToSave: MaterialMasterItem = {
        id: material?.id || new Date().toISOString() + Math.random(),
        ...formData,
    };
    onSave(materialToSave);
  };

  const handleSuggestion = async () => {
    if (!suggestionPrompt) return;
    setIsSuggesting(true);
    setSuggestionError('');
    try {
        const suggestion = await suggestMaterial(suggestionPrompt);
        if (suggestion) {
            setFormData({
                name: suggestion.name,
                category: suggestion.category,
                subCategory: suggestion.subCategory || '',
                properties: suggestion.properties
            });
        } else {
            setSuggestionError('Could not generate a suggestion. Please try a different prompt.');
        }
    } catch (error) {
        console.error('Gemini suggestion failed:', error);
        setSuggestionError('An error occurred while getting suggestions. Please check the console.');
    } finally {
        setIsSuggesting(false);
    }
  };
  
  const categories: MaterialMasterItem['category'][] = ["P - Steel", "M - Stainless Steel", "K - Cast Iron", "N - Non-ferrous", "S - Superalloys & Titanium", "H - Hardened Steel", "O - Polymers", "SO - Special Alloys", "Other"];
  
  const properties = formData.properties as { [key: string]: MaterialProperty };
  const customProperties = useMemo(() => Object.keys(properties).filter(key => ![
      "Cost Per Kg", "Density", "Elongation at Break", "Hardness, Brinell", "Hardness, Rockwell C",
      "Hardness, Rockwell R", "Modulus of Elasticity", "Tensile Strength, Ultimate", "Thermal Conductivity"
  ].includes(key)), [properties]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="max-w-3xl w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="text-2xl font-bold text-primary mb-6">{material ? 'Edit Material' : 'Add New Material'}</h2>
        
        <div className="mb-6 p-4 border border-dashed border-primary/50 rounded-lg bg-primary/5">
            <h3 className="text-lg font-semibold text-primary mb-2">Suggest with AI</h3>
            <p className="text-sm text-text-secondary mb-3">Describe a material, and our AI assistant will fill in the details.</p>
            <textarea value={suggestionPrompt} onChange={(e) => setSuggestionPrompt(e.target.value)} placeholder="e.g., 'a common, cheap, weldable steel' or 'lightweight aluminum for aerospace'" className="block w-full px-3 py-2 border rounded-md focus:outline-none sm:text-sm bg-background/50 text-text-input border-border placeholder-text-muted focus:ring-primary focus:border-primary" rows={2} disabled={isSuggesting} />
            <div className="mt-3 flex items-center justify-end">
                {suggestionError && <p className="text-sm text-red-500 mr-4">{suggestionError}</p>}
                <Button type="button" onClick={handleSuggestion} disabled={isSuggesting || !suggestionPrompt}>{isSuggesting ? 'Suggesting...' : 'Suggest with AI'}</Button>
            </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Material Name" name="name" value={formData.name} onChange={handleInputChange} required />
                <Select label="Category" name="category" value={formData.category} onChange={handleInputChange}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </Select>
            </div>
            <Input label="Sub-Category" name="subCategory" value={formData.subCategory || ''} onChange={handleInputChange} placeholder="e.g., Low Carbon Steel" />
            
            <div className="space-y-4">
                <PropertyInput propName="Density" value={properties["Density"]} onChange={handlePropertyChange} unit="g/cm³" />
            </div>

            <div className="pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-primary mb-2">Mechanical Properties</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PropertyInput propName="Tensile Strength, Ultimate" value={properties["Tensile Strength, Ultimate"]} onChange={handlePropertyChange} unit="MPa" />
                    <PropertyInput propName="Modulus of Elasticity" value={properties["Modulus of Elasticity"]} onChange={handlePropertyChange} unit="GPa" />
                    <PropertyInput propName="Elongation at Break" value={properties["Elongation at Break"]} onChange={handlePropertyChange} unit="%" />
                </div>
            </div>

             <div className="pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-primary mb-2">Hardness</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PropertyInput propName="Hardness, Brinell" value={properties["Hardness, Brinell"]} onChange={handlePropertyChange} unit="" isNumeric={false} />
                    <PropertyInput propName="Hardness, Rockwell C" value={properties["Hardness, Rockwell C"]} onChange={handlePropertyChange} unit="" isNumeric={false} />
                    <PropertyInput propName="Hardness, Rockwell R" value={properties["Hardness, Rockwell R"]} onChange={handlePropertyChange} unit="" isNumeric={false} />
                </div>
            </div>
            
             <div className="pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-primary mb-2">Thermal Properties</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PropertyInput propName="Thermal Conductivity" value={properties["Thermal Conductivity"]} onChange={handlePropertyChange} unit="W/m-K" />
                </div>
            </div>

             <div className="pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-primary mb-2">Other Properties</h3>
                {customProperties.map(key => (
                     <div key={key} className="grid grid-cols-5 gap-2 items-end">
                        <Input label="Property" value={key} disabled className="col-span-2" />
                        <Input label="Value" value={properties[key]?.value ?? ''} onChange={e => handlePropertyChange(key, 'value', e.target.value)} className="col-span-2" />
                        <Input label="Unit" value={properties[key]?.unit ?? ''} onChange={e => handlePropertyChange(key, 'unit', e.target.value)} />
                    </div>
                ))}
                <div className="grid grid-cols-5 gap-2 items-end mt-2">
                    <Input label="New Property Name" value={newPropName} onChange={e => setNewPropName(e.target.value)} placeholder="e.g., Poisson's Ratio" className="col-span-2" />
                    <Input label="Value" value={newPropValue} onChange={e => setNewPropValue(e.target.value)} className="col-span-2" />
                    <Input label="Unit" value={newPropUnit} onChange={e => setNewPropUnit(e.target.value)} />
                </div>
                 <Button type="button" variant="secondary" onClick={handleAddNewProperty} className="mt-2">+ Add Property</Button>
            </div>
          </div>
          <div className="flex justify-end space-x-4 mt-8 border-t border-border pt-6">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Material</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};