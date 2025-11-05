

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Calculation, MachiningInput, Operation, MaterialMasterItem, BilletShapeParameters, CalculatorPageProps, Setup, Machine, Process, User, ProcessParameter, MaterialProperty, SurfaceTreatment, Markups } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { calculateMachiningCosts, calculateBilletWeight, calculateOperationTime } from '../services/calculationService';
import { RAW_MATERIAL_PROCESSES, BILLET_SHAPES, MACHINE_TYPES } from '../constants';
import { OperationModal } from '../components/OperationModal';
import { DisplayField } from '../components/ui/DisplayField';
import { CloseIcon } from '../components/ui/CloseIcon';

const uuid = () => `id_${Math.random().toString(36).substring(2, 9)}`;

// --- Unit Conversion Constants ---
const MM_TO_IN = 1 / 25.4;
const M_MIN_TO_SFM = 3.28084;
const KG_TO_LB = 2.20462;
const M2_TO_FT2 = 10.7639;

const INITIAL_INPUT: MachiningInput = {
  id: '',
  calculationNumber: '',
  partNumber: '',
  partName: '',
  revision: 'A',
  annualVolume: 1000,
  batchVolume: 100,
  createdAt: new Date().toISOString(),
  partImage: '',
  unitSystem: 'Metric',
  materialCategory: '',
  materialType: '',
  materialCostPerKg: 0,
  materialDensityGcm3: 0,
  rawMaterialProcess: 'Billet',
  billetShape: 'Block',
  billetShapeParameters: { length: 100, width: 100, height: 50 },
  rawMaterialWeightKg: 0,
  finishedPartWeightKg: 0,
  partSurfaceAreaM2: 0,
  transportCostPerKg: 0,
  surfaceTreatments: [],
  setups: [],
  markups: {
    general: 0,
    admin: 0,
    sales: 0,
    miscellaneous: 0,
    packing: 0,
    transport: 0,
    profit: 0,
    duty: 0,
  },
};

const currencySymbols: { [key: string]: string } = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

const markupLabels: { [key in keyof Markups]: string } = {
  general: 'General',
  admin: 'Admin',
  sales: 'Sales',
  miscellaneous: 'Miscellaneous',
  packing: 'Packing',
  transport: 'Transport',
  profit: 'Profit',
  duty: 'Duty',
};


const MarkupSlider: React.FC<{
  label: string;
  name: keyof Markups;
  value: number;
  onChange: (name: keyof Markups, value: string) => void;
}> = ({ label, name, value, onChange }) => (
  <div className="flex items-center gap-4">
    <label className="text-sm font-medium text-text-secondary w-28 shrink-0">
      {label}
    </label>
    <input
      type="range"
      min="0"
      max="100"
      step="1"
      name={name}
      value={value}
      onChange={e => onChange(name, e.target.value)}
      className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
    />
    <span className="font-semibold text-text-primary text-center bg-background/50 border border-border rounded-md py-1 w-20 shrink-0">
        {value}%
    </span>
  </div>
);

export const CalculatorPage: React.FC<CalculatorPageProps> = ({ user, materials, machines, processes, tools, onSave, onSaveDraft, onAutoSaveDraft, onBack, existingCalculation }) => {
  const [formData, setFormData] = useState<MachiningInput>(INITIAL_INPUT);
  const [errors, setErrors] = useState<{ [key: string]: any }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [operationModalState, setOperationModalState] = useState<{
    isOpen: boolean;
    setupId: string | null;
    operation: Operation | null;
  }>({ isOpen: false, setupId: null, operation: null });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'unsaved' | 'saving'>('idle');

  const isInitialMount = useRef(true);
  const debounceTimeout = useRef<any>(null);
  
  const isMetric = formData.unitSystem === 'Metric';

  const currency = user.currency || 'USD';
  const currencySymbol = currencySymbols[currency] || '$';

  const formatCurrency = useCallback((value: number) => {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(value);
    } catch {
        return `${currencySymbol}${value.toFixed(2)}`;
    }
  }, [currency, currencySymbol]);
  
  useEffect(() => {
    if (existingCalculation) {
      setFormData({
        ...INITIAL_INPUT,
        ...existingCalculation.inputs,
        setups: existingCalculation.inputs.setups || [],
        surfaceTreatments: existingCalculation.inputs.surfaceTreatments || [],
        markups: existingCalculation.inputs.markups || INITIAL_INPUT.markups,
        unitSystem: existingCalculation.inputs.unitSystem || 'Metric',
      });
      setSaveStatus('saved');
    } else {
      const newCalcNumber = `${user?.calcPrefix || 'EST-'}${user?.calcNextNumber || 101}`;
      setFormData(prev => {
        if (prev.id) {
          return { ...prev, calculationNumber: newCalcNumber };
        }
        return {
          ...INITIAL_INPUT,
          id: uuid(),
          createdAt: new Date().toISOString(),
          calculationNumber: newCalcNumber,
        };
      });
      setSaveStatus('idle');
    }
    isInitialMount.current = true;
  }, [existingCalculation, user]);

  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }
    
    setSaveStatus('unsaved');
    
    if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
        if (!formData.partNumber.trim()) {
            return;
        }
        setSaveStatus('saving');
        await onAutoSaveDraft(formData);
        setSaveStatus('saved');
    }, 2000);

    return () => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
    }
  }, [formData, onAutoSaveDraft]);

  useEffect(() => {
    const { rawMaterialProcess, billetShape, billetShapeParameters, materialDensityGcm3 } = formData;

    if (rawMaterialProcess !== 'Billet') {
      return;
    }
    
    const newWeightKg = calculateBilletWeight(billetShape!, billetShapeParameters!, materialDensityGcm3);
    
    if (formData.rawMaterialWeightKg !== newWeightKg) {
      setFormData(prev => ({ ...prev, rawMaterialWeightKg: newWeightKg }));
    }
  }, [formData.rawMaterialProcess, formData.billetShape, formData.billetShapeParameters, formData.materialDensityGcm3]);

    const convertValue = useCallback((value: number, unit: string, to: 'Metric' | 'Imperial') => {
        if (to === 'Imperial') { // from Metric
            if (unit === 'mm' || unit === 'mm/rev' || unit === 'mm/min') return value * MM_TO_IN;
            if (unit === 'm/min') return value * M_MIN_TO_SFM;
            if (unit === 'kg') return value * KG_TO_LB;
            if (unit === 'm²') return value * M2_TO_FT2;
        } else { // from Imperial
            if (unit === 'in' || unit === 'in/rev' || unit === 'in/min') return value / MM_TO_IN;
            if (unit === 'sfm') return value / M_MIN_TO_SFM;
            if (unit === 'lb') return value / KG_TO_LB;
            if (unit === 'ft²') return value / M2_TO_FT2;
        }
        return value;
    }, []);

    const getDisplayValue = useCallback((metricValue: number, metricUnit: string) => {
        if (isMetric || !metricUnit) return metricValue;
        
        let imperialUnit;
        switch (metricUnit) {
            case 'mm': case 'mm/rev': case 'mm/min': imperialUnit = 'in'; break;
            case 'm/min': imperialUnit = 'sfm'; break;
            case 'kg': imperialUnit = 'lb'; break;
            case 'm²': imperialUnit = 'ft²'; break;
            default: imperialUnit = metricUnit;
        }

        const imperialValue = convertValue(metricValue, metricUnit, 'Imperial');
        return parseFloat(imperialValue.toPrecision(4));
    }, [isMetric, convertValue]);

    const getMetricValue = useCallback((displayValue: number, metricUnit: string) => {
        if (isMetric) return displayValue;

        let imperialUnit;
         switch (metricUnit) {
            case 'mm': case 'mm/rev': case 'mm/min': imperialUnit = 'in'; break;
            case 'm/min': imperialUnit = 'sfm'; break;
            case 'kg': imperialUnit = 'lb'; break;
            case 'm²': imperialUnit = 'ft²'; break;
            default: imperialUnit = metricUnit;
        }

        return convertValue(displayValue, imperialUnit, 'Metric');
    }, [isMetric, convertValue]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseFloat(value) || 0 : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setTimeout(() => {
      const localImageUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, partImage: localImageUrl }));
      setIsUploading(false);
    }, 500);
  };

  const handleMaterialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const materialId = e.target.value;
    const selectedMaterial = materials.find(m => m.id === materialId);
    if (selectedMaterial) {
      const properties = selectedMaterial.properties as { [key: string]: MaterialProperty };
      
      const findProperty = (baseName: string): MaterialProperty | undefined => {
        for (const key in properties) {
            const cleanKey = key.trim().replace(/\s*\([^)]+\)/, '').trim();
            if (cleanKey === baseName) return properties[key];
        }
        return undefined;
      };

      const densityProp = findProperty('Density');
      const costProp = findProperty('Cost Per Kg');

      setFormData(prev => ({
        ...prev,
        materialType: selectedMaterial.id,
        materialCostPerKg: parseFloat(costProp?.value as string) || 0,
        materialDensityGcm3: parseFloat(densityProp?.value as string) || 0,
      }));
    } else {
        setFormData(prev => ({...prev, materialType: ''}));
    }
  };

   const handleBilletShapeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const shapeName = e.target.value;
    const shape = BILLET_SHAPES.find(s => s.name === shapeName) as (typeof BILLET_SHAPES)[number] | undefined;
    const newParams: BilletShapeParameters = {};
    if (shape) {
        shape.parameters.forEach(p => {
            newParams[p.name as keyof BilletShapeParameters] = 10; // Default value
        });
    }
    setFormData(prev => ({ ...prev, billetShape: shape?.name as any, billetShapeParameters: newParams }));
  };
  
  const handleBilletParamChange = (paramName: keyof BilletShapeParameters, value: string) => {
    const displayValue = parseFloat(value) || 0;
    const metricValue = getMetricValue(displayValue, 'mm'); // Billet dimensions are always length
    
    setFormData(prev => ({
      ...prev,
      billetShapeParameters: {
        ...prev.billetShapeParameters,
        [paramName]: metricValue,
      }
    }));
  };

  const handleWeightInputChange = (fieldName: 'rawMaterialWeightKg' | 'finishedPartWeightKg', value: string) => {
    const displayValue = parseFloat(value) || 0;
    const metricValue = getMetricValue(displayValue, 'kg');
    setFormData(prev => ({...prev, [fieldName]: metricValue }));
  };
  
  const handleSurfaceAreaChange = (value: string) => {
    const displayValue = parseFloat(value) || 0;
    const metricValue = getMetricValue(displayValue, 'm²');
    setFormData(prev => ({...prev, partSurfaceAreaM2: metricValue}));
  };
  
  // --- Surface Treatment Handlers ---
  const addSurfaceTreatment = () => {
    const newTreatment: SurfaceTreatment = { id: uuid(), name: '', cost: 0, unit: 'per_kg', based_on: 'finished_weight' };
    setFormData(prev => ({...prev, surfaceTreatments: [...prev.surfaceTreatments, newTreatment]}));
  };

  const updateSurfaceTreatment = (index: number, field: keyof SurfaceTreatment, value: string | number) => {
    setFormData(prev => {
        const newTreatments = [...prev.surfaceTreatments];
        const treatmentToUpdate = { ...newTreatments[index] };

        (treatmentToUpdate as any)[field] = value;
        
        if (field === 'unit' && value === 'per_kg') {
          if (!treatmentToUpdate.based_on) {
            treatmentToUpdate.based_on = 'finished_weight';
          }
        }

        newTreatments[index] = treatmentToUpdate;
        return {...prev, surfaceTreatments: newTreatments};
    });
  };

  const removeSurfaceTreatment = (id: string) => {
    setFormData(prev => ({...prev, surfaceTreatments: prev.surfaceTreatments.filter(t => t.id !== id)}));
  };

  // --- Setup and Operation Handlers ---
  const addSetup = () => {
    const newSetup: Setup = { id: uuid(), name: `Setup ${formData.setups.length + 1}`, timePerSetupMin: 30, toolChangeTimeSec: 60, efficiency: 1, operations: [], description: '', };
    setFormData(prev => ({ ...prev, setups: [...prev.setups, newSetup] }));
  };

  const removeSetup = (setupId: string) => { setFormData(prev => ({ ...prev, setups: prev.setups.filter(s => s.id !== setupId) })); };
  
  const updateSetupField = (setupId: string, field: keyof Setup, value: string | number) => {
    setFormData(prev => ({ ...prev, setups: prev.setups.map(s => s.id === setupId ? { ...s, [field]: value } : s) }));
  };
  
  const handleEfficiencyChange = (setupId: string, value: string) => {
      const percentage = parseFloat(value) || 0;
      updateSetupField(setupId, 'efficiency', percentage / 100);
  }

    const handleOpenOperationModal = useCallback((setupId: string, operation: Operation | null) => {
        const setup = formData.setups.find(s => s.id === setupId);
        if (!setup?.machineId) {
            alert("Please select a machine for this setup before adding operations.");
            return;
        }
        const machine = machines.find(m => m.id === setup.machineId);
        const compatibleProcesses = machine ? processes.filter(p => p.compatibleMachineTypes.includes(machine.machineType)) : [];

        if (!operation && compatibleProcesses.length === 0) {
            alert("The selected machine has no compatible processes defined. Please choose another machine or add processes to the library.");
            return;
        }
        setOperationModalState({ isOpen: true, setupId, operation });
    }, [formData.setups, machines, processes]);

    const handleCloseOperationModal = useCallback(() => {
        setOperationModalState({ isOpen: false, setupId: null, operation: null });
    }, []);

    const handleSaveOperation = useCallback((setupId: string, operation: Operation) => {
        setFormData(prev => ({
            ...prev,
            setups: prev.setups.map(s => {
                if (s.id === setupId) {
                    const opExists = s.operations.some(o => o.id === operation.id);
                    const newOps = opExists
                        ? s.operations.map(o => o.id === operation.id ? operation : o)
                        : [...s.operations, operation];
                    return { ...s, operations: newOps };
                }
                return s;
            })
        }));
        handleCloseOperationModal();
    }, [handleCloseOperationModal]);

  const removeOperation = (setupId: string, operationId: string) => {
    setFormData(prev => ({ ...prev, setups: prev.setups.map(s => s.id === setupId ? { ...s, operations: s.operations.filter(o => o.id !== operationId) } : s) }));
  };
  
  const formatParameters = (op: Operation, process: Process | undefined): string => {
    if (!process || !Array.isArray(process.parameters)) return 'N/A';
    const params = process.parameters as ProcessParameter[];
    return params
      .slice(0, 3) // Show first 3 params for brevity
      .map(p => `${p.label.split('(')[0].trim()}: ${getDisplayValue(op.parameters[p.name] || 0, p.unit).toFixed(1)} ${isMetric ? p.unit : p.imperialUnit || p.unit}`)
      .join(' | ');
  };

  const handleMarkupChange = (name: keyof Markups, value: string) => {
    const percentage = parseFloat(value) || 0;
    setFormData(prev => ({
        ...prev,
        markups: {
            ...prev.markups,
            [name]: percentage
        }
    }));
  };

  // --- Submission ---
  const validateForm = () => { return true; };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const results = calculateMachiningCosts(formData, machines, processes, tools);
      onSave({ id: formData.id, inputs: formData, results: results, status: 'final', user_id: user.id, created_at: formData.createdAt });
    }
  };
  
  const handleSaveDraftClick = () => { onSaveDraft(formData); };

  const selectedMaterial = useMemo(() => materials.find(m => m.id === formData.materialType), [materials, formData.materialType]);
  
  const { rawMaterialCostPerPart, machiningCostPerPart, surfaceTreatmentCostPerPart, totalCostPerPart } = useMemo(() => {
    const results = calculateMachiningCosts(formData, machines, processes, tools);
    return {
      rawMaterialCostPerPart: results.rawMaterialPartCost,
      machiningCostPerPart: formData.batchVolume > 0 ? results.machiningCost / formData.batchVolume : 0,
      surfaceTreatmentCostPerPart: formData.batchVolume > 0 ? results.surfaceTreatmentCost / formData.batchVolume : 0,
      totalCostPerPart: results.costPerPart,
    };
  }, [formData, machines, processes, tools]);
  
  const markupValuesPerPart = useMemo(() => {
    const baseCost1 = rawMaterialCostPerPart + machiningCostPerPart;
    const baseCost2 = baseCost1 + surfaceTreatmentCostPerPart;
    
    return {
        general: baseCost1 * ((formData.markups.general || 0) / 100),
        admin: baseCost1 * ((formData.markups.admin || 0) / 100),
        sales: baseCost1 * ((formData.markups.sales || 0) / 100),
        miscellaneous: baseCost1 * ((formData.markups.miscellaneous || 0) / 100),
        packing: baseCost2 * ((formData.markups.packing || 0) / 100),
        transport: baseCost2 * ((formData.markups.transport || 0) / 100),
        profit: baseCost2 * ((formData.markups.profit || 0) / 100),
        duty: baseCost2 * ((formData.markups.duty || 0) / 100),
    };
  }, [rawMaterialCostPerPart, machiningCostPerPart, surfaceTreatmentCostPerPart, formData.markups]);

  const materialCategories = useMemo(() => Array.from(new Set(materials.map(m => m.category))).sort(), [materials]);
  const filteredMaterialGrades = useMemo(() => {
    if (!formData.materialCategory) return [];
    return materials.filter(m => m.category === formData.materialCategory).sort((a,b) => a.name.localeCompare(b.name));
  }, [materials, formData.materialCategory]);


  return (
    <div className="w-full mx-auto animate-fade-in">
        {operationModalState.isOpen && operationModalState.setupId && (
            <OperationModal
                isOpen={operationModalState.isOpen}
                onClose={handleCloseOperationModal}
                onSave={handleSaveOperation}
                setup={formData.setups.find(s => s.id === operationModalState.setupId)!}
                operationToEdit={operationModalState.operation}
                processes={processes}
                tools={tools}
                machines={machines}
                isMetric={isMetric}
                getDisplayValue={getDisplayValue}
                getMetricValue={getMetricValue}
                formatCurrency={formatCurrency}
            />
        )}
        <main>
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Part Details */}
                <Card>
                    <div className="flex justify-between items-center border-b border-border pb-3 mb-6">
                       <h2 className="text-2xl font-semibold text-primary">Part Details</h2>
                       {formData.calculationNumber && <span className="text-lg font-bold text-text-secondary">#{formData.calculationNumber}</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Input label="Part Number" name="partNumber" value={formData.partNumber} onChange={handleInputChange} error={errors.partNumber} />
                        <Input label="Part Name" name="partName" value={formData.partName} onChange={handleInputChange} error={errors.partName} />
                        <Input label="Revision" name="revision" value={formData.revision} onChange={handleInputChange} />
                        <Select label="Material Category" name="materialCategory" value={formData.materialCategory} onChange={(e) => {
                            handleInputChange(e);
                            setFormData(prev => ({ ...prev, materialType: '' }));
                          }}>
                            <option value="">Select a category...</option>
                            {materialCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </Select>
                        <Select label="Material Grade" name="materialType" value={formData.materialType} onChange={handleMaterialChange} error={errors.materialType} disabled={!formData.materialCategory}>
                            <option value="">Select a grade...</option>
                            {filteredMaterialGrades.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </Select>
                        <Input label="Annual Volume" name="annualVolume" type="number" value={formData.annualVolume} onChange={handleInputChange} error={errors.annualVolume} unit="parts/yr" />
                        <Input label="Batch Volume" name="batchVolume" type="number" value={formData.batchVolume} onChange={handleInputChange} error={errors.batchVolume} unit="parts" />
                         <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Part Image</label>
                            <div className="mt-1 flex items-center space-x-4">
                                <div className="h-16 w-16 rounded-md bg-surface border border-border flex items-center justify-center">
                                    {formData.partImage ? (
                                        <img src={formData.partImage} alt="Part" className="h-full w-full rounded-md object-cover"/>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </div>
                                <label htmlFor="file-upload" className={`cursor-pointer bg-surface py-2 px-3 border border-border rounded-md shadow-sm text-sm leading-4 font-medium text-text-primary hover:bg-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${isUploading ? 'opacity-50' : ''}`}>
                                    <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" disabled={isUploading}/>
                                </label>
                            </div>
                        </div>
                        <div className="flex items-end">
                            <div className="p-1 bg-background/50 border border-border rounded-lg flex items-center space-x-1">
                                <Button type="button" onClick={() => handleInputChange({ target: { name: 'unitSystem', value: 'Metric' } } as any)} variant={isMetric ? 'primary' : 'secondary'}>Metric</Button>
                                <Button type="button" onClick={() => handleInputChange({ target: { name: 'unitSystem', value: 'Imperial' } } as any)} variant={!isMetric ? 'primary' : 'secondary'}>Imperial</Button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Raw Material Geometry & Weight */}
                <Card>
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Raw Material Geometry & Weight</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        <Select label="Process" name="rawMaterialProcess" value={formData.rawMaterialProcess} onChange={handleInputChange}>
                            {RAW_MATERIAL_PROCESSES.map(p => <option key={p} value={p}>{p}</option>)}
                        </Select>
                        {formData.rawMaterialProcess === 'Billet' && (
                          <>
                            <Select label="Billet Shape" name="billetShape" value={formData.billetShape} onChange={handleBilletShapeChange}>
                                {BILLET_SHAPES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </Select>
                            {BILLET_SHAPES.find(s => s.name === formData.billetShape)?.parameters.map(param => (
                                <Input 
                                    key={param.name}
                                    label={param.label}
                                    type="number"
                                    step="any"
                                    name={param.name}
                                    value={getDisplayValue(formData.billetShapeParameters?.[param.name as keyof BilletShapeParameters] || 0, 'mm')}
                                    onChange={(e) => handleBilletParamChange(param.name as keyof BilletShapeParameters, e.target.value)}
                                    unit={isMetric ? "mm" : "in"}
                                />
                            ))}
                          </>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                      {formData.rawMaterialProcess === 'Billet' ? (
                        <DisplayField label="Calculated Raw Material Weight" value={getDisplayValue(formData.rawMaterialWeightKg, 'kg').toFixed(3)} unit={isMetric ? "kg" : "lb"} />
                      ) : (
                        <Input label="Raw Material Weight" name="rawMaterialWeightKg" type="number" step="any" value={getDisplayValue(formData.rawMaterialWeightKg, 'kg')} onChange={(e) => handleWeightInputChange('rawMaterialWeightKg', e.target.value)} unit={isMetric ? "kg" : "lb"} />
                      )}
                       <Input label="Finished Part Weight" name="finishedPartWeightKg" type="number" step="any" value={getDisplayValue(formData.finishedPartWeightKg, 'kg')} onChange={(e) => handleWeightInputChange('finishedPartWeightKg', e.target.value)} error={errors.finishedPartWeightKg} unit={isMetric ? "kg" : "lb"} />
                       <Input label="Part Surface Area" name="partSurfaceAreaM2" type="number" step="any" value={getDisplayValue(formData.partSurfaceAreaM2, 'm²')} onChange={(e) => handleSurfaceAreaChange(e.target.value)} error={errors.partSurfaceAreaM2} unit={isMetric ? "m²" : "ft²"} />
                    </div>
                </Card>

                {/* Raw Material Cost */}
                <Card>
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Raw Material Cost</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                        <DisplayField label="Selected Material" value={selectedMaterial?.name || 'N/A'} />
                        <DisplayField label="Density" value={formData.materialDensityGcm3} unit="g/cm³" />
                        <Input label="Material Cost" name="materialCostPerKg" type="number" step="any" value={formData.materialCostPerKg} onChange={handleInputChange} unit={`${currencySymbol}/kg`} />
                        <Input label="Transport Cost" name="transportCostPerKg" type="number" step="any" value={formData.transportCostPerKg} onChange={handleInputChange} unit={`${currencySymbol}/kg`} />
                    </div>
                </Card>

                {/* Machining Setups & Operations */}
                <Card>
                    <div className="flex justify-between items-center border-b border-border pb-3 mb-6">
                        <h2 className="text-2xl font-semibold text-primary">Machining Setups</h2>
                        <Button type="button" onClick={addSetup}>+ Add Setup</Button>
                    </div>
                    <div className="space-y-6">
                        {formData.setups.map((setup) => {
                             const selectedMachine = machines.find(m => m.id === setup.machineId);
                             
                             return (
                            <div key={setup.id} className="bg-background/50 border border-border p-4 rounded-lg relative">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    <Input label="Setup Name" value={setup.name} onChange={e => updateSetupField(setup.id, 'name', e.target.value)} />
                                     <Select label="Machine Type" value={setup.machineType || ''} onChange={e => {
                                        updateSetupField(setup.id, 'machineType', e.target.value);
                                        updateSetupField(setup.id, 'machineId', ''); // Reset machine on type change
                                     }}>
                                        <option value="">Select machine type...</option>
                                        {MACHINE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                    </Select>
                                     <Select label="Machine" value={setup.machineId || ''} onChange={e => updateSetupField(setup.id, 'machineId', e.target.value)} disabled={!setup.machineType}>
                                        <option value="">Select machine...</option>
                                        {machines.filter(m => m.machineType === setup.machineType).map(m => <option key={m.id} value={m.id}>{m.name} ({m.brand})</option>)}
                                    </Select>
                                    <DisplayField label="Machine Rate" value={selectedMachine ? formatCurrency(selectedMachine.hourlyRate) : 'N/A'} unit="/hr" />
                                    <Input label="Setup Time" type="number" step="any" value={setup.timePerSetupMin} onChange={e => updateSetupField(setup.id, 'timePerSetupMin', parseFloat(e.target.value) || 0)} unit="min" />
                                    <Input label="Tool Change Time" type="number" step="any" value={setup.toolChangeTimeSec} onChange={e => updateSetupField(setup.id, 'toolChangeTimeSec', parseFloat(e.target.value) || 0)} unit="sec/tool" />
                                    <div className="lg:col-span-2">
                                        <label className="block text-sm font-medium text-text-secondary mb-1 flex justify-between">
                                            <span>Setup Efficiency</span>
                                            <span className="font-semibold text-text-primary">{Math.round(setup.efficiency * 100)}%</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="100"
                                            step="1"
                                            value={Math.round(setup.efficiency * 100)}
                                            onChange={e => handleEfficiencyChange(setup.id, e.target.value)}
                                            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary mt-2"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-full">
                                    <Input label="Setup Comments" value={setup.description || ''} onChange={e => updateSetupField(setup.id, 'description', e.target.value)} />
                                </div>
                                <button type="button" onClick={() => removeSetup(setup.id)} className="absolute top-4 right-4 text-text-muted hover:text-red-500">
                                    <CloseIcon />
                                </button>
                                
                                <div className="pl-2 mt-6 border-t border-border pt-4">
                                    <h4 className="text-lg font-semibold text-primary mb-4">Operations</h4>
                                    <div className="overflow-x-auto">
                                        {setup.operations.length > 0 ? (
                                            <table className="min-w-full divide-y divide-border text-sm">
                                                <thead className="bg-surface/50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">#</th>
                                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Operation</th>
                                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Tool</th>
                                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Parameters</th>
                                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Cycle Time</th>
                                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Cost</th>
                                                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-surface divide-y divide-border">
                                                    {setup.operations.map((op, opIndex) => {
                                                        const processDef = processes.find(p => p.name === op.processName);
                                                        const selectedTool = tools.find(t => t.id === op.toolId);
                                                        const time = calculateOperationTime(op, processDef!, selectedTool || null) / (setup.efficiency || 1);
                                                        const cost = selectedMachine ? (time / 60) * selectedMachine.hourlyRate : 0;
                                                        return (
                                                            <tr key={op.id} className="hover:bg-background/40">
                                                                <td className="px-3 py-2 text-text-secondary">{opIndex + 1}</td>
                                                                <td className="px-3 py-2 font-semibold text-text-primary">{op.processName}</td>
                                                                <td className="px-3 py-2 text-text-secondary truncate max-w-xs">{selectedTool?.name || 'N/A'}</td>
                                                                <td className="px-3 py-2 text-text-secondary truncate max-w-xs">{formatParameters(op, processDef)}</td>
                                                                <td className="px-3 py-2 text-text-primary font-medium">{time.toFixed(2)} min</td>
                                                                <td className="px-3 py-2 text-green-500 font-medium">{formatCurrency(cost)}</td>
                                                                <td className="px-3 py-2 text-right space-x-2">
                                                                    <Button type="button" variant="secondary" className="!px-3 !py-1 text-xs" onClick={() => handleOpenOperationModal(setup.id, op)}>Edit</Button>
                                                                    <Button type="button" variant="secondary" className="!px-3 !py-1 text-xs text-red-500 hover:bg-red-500/10" onClick={() => removeOperation(setup.id, op.id)}>Delete</Button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p className="text-center text-text-muted py-4">No operations added for this setup.</p>
                                        )}
                                    </div>
                                    <Button type="button" variant="secondary" onClick={() => handleOpenOperationModal(setup.id, null)} className="mt-4" disabled={!setup.machineId}>+ Add Operation</Button>
                                </div>
                            </div>
                        )})}
                    </div>
                </Card>
                
                {/* Surface Treatment - Moved after Machining */}
                <Card>
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Surface Treatment</h2>
                    <div className="space-y-4">
                        {formData.surfaceTreatments.map((treatment, index) => (
                            <div key={treatment.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-background/50 p-3 rounded-lg">
                                <Input label="Treatment Name" value={treatment.name} onChange={e => updateSurfaceTreatment(index, 'name', e.target.value)} />
                                <Input label="Cost" type="number" step="any" value={treatment.cost} onChange={e => updateSurfaceTreatment(index, 'cost', parseFloat(e.target.value) || 0)} />
                                <Select label="Unit" value={treatment.unit} onChange={e => updateSurfaceTreatment(index, 'unit', e.target.value)}>
                                    <option value="per_kg">per kg</option>
                                    <option value="per_area">per m²</option>
                                </Select>
                                {treatment.unit === 'per_kg' ? (
                                    <Select label="Based On" value={treatment.based_on || 'finished_weight'} onChange={e => updateSurfaceTreatment(index, 'based_on', e.target.value)}>
                                        <option value="finished_weight">Finished Weight</option>
                                        <option value="raw_weight">Raw Weight</option>
                                    </Select>
                                ) : (
                                    <div /> // Placeholder to maintain grid alignment
                                )}
                                <Button type="button" variant="secondary" onClick={() => removeSurfaceTreatment(treatment.id)} className="text-red-500 hover:bg-red-500/10 h-10 self-end">
                                    Remove
                                </Button>
                            </div>
                        ))}
                        {formData.surfaceTreatments.length === 0 && <p className="text-text-muted text-center py-4">No surface treatments added.</p>}
                    </div>
                    <Button type="button" variant="secondary" onClick={addSurfaceTreatment} className="mt-4">+ Add Treatment</Button>
                </Card>

                 {/* Cost Summary */}
                <Card>
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Cost Summary (per Part)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <DisplayField label="Raw Material Cost" value={formatCurrency(rawMaterialCostPerPart)} />
                        <DisplayField label="Machining Cost" value={formatCurrency(machiningCostPerPart)} />
                        <DisplayField label="Surface Treatment Cost" value={formatCurrency(surfaceTreatmentCostPerPart)} />
                    </div>
                </Card>
                
                {/* Markups */}
                <Card>
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Markup</h2>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                             <p className="md:col-span-2 text-sm text-text-muted">Applied to (Raw Material + Machining Cost)</p>
                            <MarkupSlider label="General" name="general" value={formData.markups.general} onChange={handleMarkupChange} />
                            <MarkupSlider label="Admin" name="admin" value={formData.markups.admin} onChange={handleMarkupChange} />
                            <MarkupSlider label="Sales" name="sales" value={formData.markups.sales} onChange={handleMarkupChange} />
                            <MarkupSlider label="Miscellaneous" name="miscellaneous" value={formData.markups.miscellaneous} onChange={handleMarkupChange} />
                        </div>
                        <div className="border-t border-border pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <p className="md:col-span-2 text-sm text-text-muted">Applied to (Raw Material + Machining + Surface Treatment)</p>
                           <MarkupSlider label="Packing" name="packing" value={formData.markups.packing} onChange={handleMarkupChange} />
                           <MarkupSlider label="Transport" name="transport" value={formData.markups.transport} onChange={handleMarkupChange} />
                           <MarkupSlider label="Duty" name="duty" value={formData.markups.duty} onChange={handleMarkupChange} />
                           <MarkupSlider label="Profit" name="profit" value={formData.markups.profit} onChange={handleMarkupChange} />
                        </div>
                    </div>
                </Card>

                {/* Markup Breakup */}
                <Card>
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Markup Breakup (per Part)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        {Object.entries(markupValuesPerPart).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center py-2 px-3 rounded-md bg-background/50">
                                <span className="text-text-secondary">{markupLabels[key as keyof Markups]}</span>
                                <div className="flex items-center space-x-3">
                                    <span className="font-semibold text-text-secondary w-12 text-right">{formData.markups[key as keyof Markups]}%</span>
                                    <span className="font-semibold text-text-primary w-24 text-right">{formatCurrency(value)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
                
                {/* Final Part Cost */}
                <Card className="!p-0 overflow-hidden">
                    <div className="p-6 text-center">
                        <h3 className="text-xl font-bold text-primary">Final Part Cost</h3>
                    </div>
                    <div className="bg-primary/10 p-6 text-center border-t-2 border-primary">
                        <span className="text-4xl font-black text-primary">{formatCurrency(totalCostPerPart)}</span>
                        <span className="text-lg ml-2 text-text-secondary">/ Part</span>
                    </div>
                </Card>


                {/* Actions */}
                <div className="flex justify-end items-center space-x-4 pt-6 border-t border-border">
                    <div className="text-sm text-text-muted transition-opacity duration-300 mr-auto">
                        {saveStatus === 'unsaved' && 'Changes detected...'}
                        {saveStatus === 'saving' && (
                            <div className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving draft...
                            </div>
                        )}
                        {saveStatus === 'saved' && '✓ All changes saved'}
                    </div>
                    <Button type="button" variant="secondary" onClick={handleSaveDraftClick}>Save Draft</Button>
                    <Button type="submit">Calculate & Save</Button>
                </div>
            </form>
        </main>
    </div>
  );
};