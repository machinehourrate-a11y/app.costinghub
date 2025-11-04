import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Calculation, MachiningInput, Operation, MaterialMasterItem, BilletShapeParameters, CalculatorPageProps, Setup, Machine, Process, User, ProcessParameter, MaterialProperty, Tool } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { calculateMachiningCosts, calculateBilletWeight } from '../services/calculationService';
import { RAW_MATERIAL_PROCESSES, BILLET_SHAPES, MACHINE_TYPES } from '../constants';
import { ToolSelectionModal } from '../components/ToolSelectionModal';
import { OperationItem } from '../components/OperationItem';
import { DisplayField } from '../components/ui/DisplayField';
import { CloseIcon } from '../components/ui/CloseIcon';

const uuid = () => `id_${Math.random().toString(36).substring(2, 9)}`;

// --- Unit Conversion Constants ---
const MM_TO_IN = 1 / 25.4;
const M_MIN_TO_SFM = 3.28084;
const KG_TO_LB = 2.20462;

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
  materialType: '',
  materialCostPerKg: 0,
  materialDensityGcm3: 0,
  rawMaterialProcess: 'Billet',
  billetShape: 'Block',
  billetShapeParameters: { length: 100, width: 100, height: 50 },
  rawMaterialWeightKg: 0,
  finishedPartWeightKg: 0,
  transportCostPerKg: 0,
  surfaceTreatmentName: 'None',
  surfaceTreatmentCostPerKg: 0,
  setups: [],
  laborRatePerHour: 50,
  overheadRatePercentage: 150,
};

const currencySymbols: { [key: string]: string } = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

export const CalculatorPage: React.FC<CalculatorPageProps> = ({ user, materials, machines, processes, tools, onSave, onSaveDraft, onAutoSaveDraft, onBack, existingCalculation }) => {
  const [formData, setFormData] = useState<MachiningInput>(INITIAL_INPUT);
  const [errors, setErrors] = useState<{ [key: string]: any }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [toolModalState, setToolModalState] = useState<{isOpen: boolean; setupId: string | null; operationId: string | null}>({isOpen: false, setupId: null, operationId: null});
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
      // Ensure unit system is set, default to Metric if not present
      setFormData({ unitSystem: 'Metric', ...existingCalculation.inputs });
      setSaveStatus('saved');
    } else {
      const newCalcNumber = `${user?.calcPrefix || 'EST-'}${user?.calcNextNumber || 101}`;
      setFormData(prev => {
        // Only initialize fully if the form hasn't been touched (e.g., no ID yet).
        // This prevents wiping user input when the `user` prop updates after an auto-save.
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
    isInitialMount.current = true; // Flag to prevent auto-save on initial load
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
    
    // This check is crucial to prevent re-renders if the calculated value is the same.
    if (formData.rawMaterialWeightKg !== newWeightKg) {
      setFormData(prev => ({ ...prev, rawMaterialWeightKg: newWeightKg }));
    }
  }, [formData.rawMaterialProcess, formData.billetShape, formData.billetShapeParameters, formData.materialDensityGcm3]);

    const convertValue = useCallback((value: number, unit: string, to: 'Metric' | 'Imperial') => {
        if (to === 'Imperial') { // from Metric
            if (unit === 'mm' || unit === 'mm/rev' || unit === 'mm/min') return value * MM_TO_IN;
            if (unit === 'm/min') return value * M_MIN_TO_SFM;
            if (unit === 'kg') return value * KG_TO_LB;
        } else { // from Imperial
            if (unit === 'in' || unit === 'in/rev' || unit === 'in/min') return value / MM_TO_IN;
            if (unit === 'sfm') return value / M_MIN_TO_SFM;
            if (unit === 'lb') return value / KG_TO_LB;
        }
        return value;
    }, []);

    const getDisplayValue = useCallback((metricValue: number, metricUnit: string) => {
        if (isMetric || !metricUnit) return metricValue;
        const imperialValue = convertValue(metricValue, metricUnit, 'Imperial');
        return parseFloat(imperialValue.toPrecision(4));
    }, [isMetric, convertValue]);

    const getMetricValue = useCallback((displayValue: number, imperialUnit: string) => {
        if (isMetric || !imperialUnit) return displayValue;
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
    // Simulate an upload delay and use a local URL for the preview.
    // This removes the need for a backend storage service.
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
      
      // Robustly find property keys, ignoring surrounding whitespace and units in parentheses.
      const findProperty = (baseName: string): MaterialProperty | undefined => {
        for (const key in properties) {
            // Clean the key by trimming and removing unit specifiers like (g/cm³)
            const cleanKey = key.trim().replace(/\s*\([^)]+\)/, '').trim();
            if (cleanKey === baseName) {
                return properties[key];
            }
        }
        return undefined;
      };

      const densityProp = findProperty('Density');
      const costProp = findProperty('Cost Per Kg');

      const densityValue = densityProp?.value ?? 0;
      const costValue = costProp?.value ?? 0;

      setFormData(prev => ({
        ...prev,
        materialType: selectedMaterial.id,
        materialCostPerKg: parseFloat(costValue as string) || 0,
        materialDensityGcm3: parseFloat(densityValue as string) || 0,
      }));
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
    const metricValue = getMetricValue(displayValue, 'in'); // Billet dimensions are always length
    
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
    const metricValue = getMetricValue(displayValue, 'lb');
    setFormData(prev => ({...prev, [fieldName]: metricValue }));
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

  const addOperation = (setupId: string) => {
    const setup = formData.setups.find(s => s.id === setupId);
    if (!setup?.machineId) {
        alert("Please select a machine for this setup before adding operations.");
        return;
    }
    const machine = machines.find(m => m.id === setup.machineId);
    if (!machine) return;

    const availableProcesses = processes.filter(p => p.compatibleMachineTypes.includes(machine.machineType));
    if(availableProcesses.length === 0) {
        alert("The selected machine has no compatible processes defined.");
        return;
    }
    
    const firstProcess = availableProcesses[0];
    const processParams = firstProcess.parameters;

    if (!Array.isArray(processParams)) {
        alert(`Cannot add operation: The default process "${firstProcess.name}" is not configured correctly. Please check its parameters in the Process Master.`);
        return;
    }

    const newOperation: Operation = {
      id: uuid(),
      processName: firstProcess.name,
      parameters: (processParams as ProcessParameter[]).reduce((acc, p) => ({ ...acc, [p.name]: 0 }), {})
    };
    setFormData(prev => ({ ...prev, setups: prev.setups.map(s => s.id === setupId ? { ...s, operations: [...s.operations, newOperation] } : s) }));
  };
  
  const removeOperation = (setupId: string, operationId: string) => {
    setFormData(prev => ({ ...prev, setups: prev.setups.map(s => s.id === setupId ? { ...s, operations: s.operations.filter(o => o.id !== operationId) } : s) }));
  };

  const updateOperation = (setupId: string, operationId: string, field: keyof Operation, value: any) => {
    setFormData(prev => ({
        ...prev,
        setups: prev.setups.map(setup =>
            setup.id === setupId
                ? { ...setup, operations: setup.operations.map(op => {
                        if (op.id === operationId) {
                            const updatedOp = { ...op, [field]: value };
                            if (field === 'processName') {
                                const processDef = processes.find(p => p.name === value);
                                const processParams = (processDef && Array.isArray(processDef.parameters)) ? processDef.parameters as ProcessParameter[] : [];
                                updatedOp.parameters = processParams ? processParams.reduce((acc, p) => ({ ...acc, [p.name]: op.parameters[p.name] || 0 }), {}) : {};
                            }
                            return updatedOp;
                        }
                        return op;
                    }),
                } : setup ),
    }));
  };

  const updateOperationParameter = (setupId: string, operationId: string, param: ProcessParameter, value: string) => {
    const displayValue = parseFloat(value) || 0;
    const metricValue = getMetricValue(displayValue, param.imperialUnit || param.unit);

    setFormData(prev => ({
      ...prev,
      setups: prev.setups.map(setup =>
        setup.id === setupId ? { ...setup, operations: setup.operations.map(op =>
                op.id === operationId ? { ...op, parameters: { ...op.parameters, [param.name]: metricValue } } : op
              ), } : setup ),
    }));
  };

  const handleOpenToolModal = (setupId: string, operationId: string) => {
    setToolModalState({ isOpen: true, setupId, operationId });
  };
  
  const handleCloseToolModal = () => {
    setToolModalState({ isOpen: false, setupId: null, operationId: null });
  };

  const handleToolSelect = (tool: Tool) => {
    const { setupId, operationId } = toolModalState;
    if (!setupId || !operationId) return;

    setFormData(prev => ({
      ...prev,
      setups: prev.setups.map(setup => {
        if (setup.id !== setupId) return setup;
        return {
          ...setup,
          operations: setup.operations.map(op => {
            if (op.id !== operationId) return op;
            
            return { ...op, toolId: tool.id, toolName: tool.name };
          }),
        };
      }),
    }));

    handleCloseToolModal();
  };

  // --- Submission ---
  const validateForm = () => {
    // Simplified validation for brevity
    return true;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const results = calculateMachiningCosts(formData, machines, processes, tools);
      onSave({ id: formData.id, inputs: formData, results: results, status: 'final', user_id: user.id, created_at: formData.createdAt });
    }
  };
  
  const handleSaveDraftClick = () => { onSaveDraft(formData); };

  const selectedBilletShape = useMemo(() => BILLET_SHAPES.find(s => s.name === formData.billetShape), [formData.billetShape]);
  const selectedMaterial = useMemo(() => materials.find(m => m.id === formData.materialType), [materials, formData.materialType]);
  
  const totalRawMaterialCostPerKg = useMemo(() => (formData.materialCostPerKg || 0) + (formData.transportCostPerKg || 0) + (formData.surfaceTreatmentCostPerKg || 0), [formData.materialCostPerKg, formData.transportCostPerKg, formData.surfaceTreatmentCostPerKg]);

  const rawMaterialCostPerPart = useMemo(() => formData.rawMaterialWeightKg * totalRawMaterialCostPerKg, [formData.rawMaterialWeightKg, totalRawMaterialCostPerKg]);
  
  const groupedMaterials = useMemo(() => {
    const groups: Record<string, MaterialMasterItem[]> = {};
    materials.forEach(material => {
        const category = material.category || 'Other';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(material);
    });
    // Also sort materials within each group by name
    for (const category in groups) {
        groups[category].sort((a, b) => a.name.localeCompare(b.name));
    }
    // Sort the categories themselves
    return Object.entries(groups).sort(([catA], [catB]) => catA.localeCompare(catB));
  }, [materials]);

  return (
    <div className="w-full mx-auto animate-fade-in">
        <ToolSelectionModal
            isOpen={toolModalState.isOpen}
            onClose={handleCloseToolModal}
            onSelect={handleToolSelect}
            tools={tools}
            machineType={
                machines.find(m => m.id === formData.setups.find(s => s.id === toolModalState.setupId)?.machineId)?.machineType || ''
            }
        />
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
                        <Select label="Material Grade" name="materialType" value={formData.materialType} onChange={handleMaterialChange} error={errors.materialType}>
                            <option value="">Select a material...</option>
                            {groupedMaterials.map(([category, materialsInCategory]) => (
                                <optgroup key={category} label={category}>
                                    {materialsInCategory.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </optgroup>
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
                            {selectedBilletShape && selectedBilletShape.parameters.map(param => (
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
                    </div>
                </Card>

                {/* Raw Material Cost */}
                <Card>
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Raw Material Cost</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        <DisplayField label="Selected Material" value={selectedMaterial?.name || 'N/A'} />
                        <DisplayField label="Density" value={formData.materialDensityGcm3} unit="g/cm³" />
                        <DisplayField label="Material Cost" value={formData.materialCostPerKg} unit={`${currencySymbol}/kg`} />
                        <Input label="Transport Cost" name="transportCostPerKg" type="number" step="any" value={formData.transportCostPerKg} onChange={handleInputChange} unit={`${currencySymbol}/kg`} />
                        <Input label="Surface Treatment" name="surfaceTreatmentName" value={formData.surfaceTreatmentName} onChange={handleInputChange} />
                        <Input label="Treatment Cost" name="surfaceTreatmentCostPerKg" type="number" step="any" value={formData.surfaceTreatmentCostPerKg} onChange={handleInputChange} unit={`${currencySymbol}/kg`} />
                        <DisplayField label="Total Raw Material Cost" value={totalRawMaterialCostPerKg.toFixed(2)} unit={`${currencySymbol}/kg`} />
                        <DisplayField label="Raw Material Cost / Part" value={formatCurrency(rawMaterialCostPerPart)} />
                    </div>
                </Card>
                
                {/* Machining Setups & Operations */}
                <Card>
                    <div className="flex justify-between items-center border-b border-border pb-3 mb-6">
                        <h2 className="text-2xl font-semibold text-primary">Machining Setups</h2>
                        <Button type="button" onClick={addSetup}>+ Add Setup</Button>
                    </div>
                    <div className="space-y-6">
                        {formData.setups.map((setup, sIndex) => {
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
                                
                                <div className="pl-6 mt-6 border-t border-border pt-4">
                                    <h4 className="text-lg font-semibold text-primary mb-4">Operations</h4>
                                    <div className="space-y-4">
                                      {setup.operations.map((op) => (
                                          <OperationItem
                                              key={op.id}
                                              setup={setup}
                                              op={op}
                                              isMetric={isMetric}
                                              getDisplayValue={getDisplayValue}
                                              getMetricValue={getMetricValue}
                                              updateOperation={updateOperation}
                                              updateOperationParameter={updateOperationParameter}
                                              removeOperation={removeOperation}
                                              handleOpenToolModal={handleOpenToolModal}
                                              processes={processes}
                                              tools={tools}
                                              machines={machines}
                                              formatCurrency={formatCurrency}
                                          />
                                      ))}
                                    </div>
                                    <Button type="button" variant="secondary" onClick={() => addOperation(setup.id)} className="mt-4" disabled={!setup.machineId}>+ Add Operation</Button>
                                </div>
                            </div>
                        )})}
                    </div>
                </Card>

                {/* Labor & Overhead */}
                <Card>
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Costing Parameters</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Input label="Labor Rate" name="laborRatePerHour" type="number" step="any" value={formData.laborRatePerHour} onChange={handleInputChange} unit={`${currencySymbol}/hr`} />
                        <Input label="Overhead Rate" name="overheadRatePercentage" type="number" step="any" value={formData.overheadRatePercentage} onChange={handleInputChange} unit="%" />
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