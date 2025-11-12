import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { Calculation, MachiningInput, Operation, MaterialMasterItem, BilletShapeParameters, CalculatorPageProps, Setup, Machine, Process, User, ProcessParameter, MaterialProperty, SurfaceTreatment, Markups, RegionCost, RegionCurrencyMap, Tool } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { calculateMachiningCosts, calculateBilletWeight, calculateOperationTime } from '../services/calculationService';
import { RAW_MATERIAL_PROCESSES, BILLET_SHAPES, MACHINE_TYPES, CURRENCY_CONVERSION_RATES_TO_USD, ALL_CURRENCIES } from '../constants';
import { OperationModal } from '../components/OperationModal';
import { DisplayField } from '../components/ui/DisplayField';
import { CloseIcon } from '../components/ui/CloseIcon';

ChartJS.register(ArcElement, Tooltip, Legend, Title, ChartDataLabels);

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
  customerName: '',
  revision: 'A',
  annualVolume: 1000,
  batchVolume: 100,
  createdAt: new Date().toISOString(),
  partImage: '',
  unitSystem: 'Metric',
  region: 'Default',
  currency: 'USD',
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
  heatTreatmentCostPerKg: 0,
  surfaceTreatments: [],
  setups: [],
  markups: {
    general: 8,
    admin: 5,
    sales: 2,
    miscellaneous: 1,
    packing: 5,
    transport: 5,
    profit: 20,
    duty: 0,
  },
};

const currencySymbols: { [key: string]: string } = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

interface MarkupSliderProps {
    label: string;
    name: keyof Markups;
    value: number;
    onChange: (name: keyof Markups, value: string) => void;
}

const MarkupSlider: React.FC<MarkupSliderProps> = ({ label, name, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-1 flex justify-between">
            <span>{label}</span>
            <span className="font-semibold text-text-primary">{value}%</span>
        </label>
        <input
            type="range"
            min="0"
            max="100"
            step="1"
            name={name}
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary mt-2"
        />
    </div>
);

export const CalculatorPage: React.FC<CalculatorPageProps> = ({ user, materials, machines, processes, tools, regionCosts, regionCurrencyMap, onSave, onSaveDraft, onAutoSaveDraft, onBack, existingCalculation, theme }) => {
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
  const debounceTimeout = useRef<number | null>(null);
  
  const isMetric = formData.unitSystem === 'Metric';

  const currency = formData.currency || 'USD';
  const currencySymbol = currencySymbols[currency] || '$';

  const formatCurrency = useCallback((value: number) => {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(value);
    } catch {
        return `${currencySymbol}${value.toFixed(2)}`;
    }
  }, [currency, currencySymbol]);

  const availableRegions = useMemo(() => {
    const regionsFromMap = [...new Set(regionCurrencyMap.map(rcm => rcm.region))];
    // Ensure Default is always an option and comes first
    const sorted = regionsFromMap.filter(r => r !== 'Default').sort();
    return ['Default', ...sorted];
  }, [regionCurrencyMap]);

  const getPriceInfo = useCallback((
    itemId: string,
    itemType: 'material' | 'machine' | 'tool',
    region: string,
    fallbackPrice: number,
    itemName: string
  ): { price: number; warning?: string } => {
      const now = new Date();

      const getRegionCost = (targetRegion: string): RegionCost | null => {
          const regionSpecificCosts = regionCosts
              .filter(rc => rc.item_id === itemId && rc.item_type === itemType && rc.region === targetRegion && new Date(rc.valid_from) <= now)
              .sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime());
          return regionSpecificCosts.length > 0 ? regionSpecificCosts[0] : null;
      };

      let costEntry = getRegionCost(region);
      let warning: string | undefined = undefined;

      if (!costEntry && region !== 'Default') {
          costEntry = getRegionCost('Default');
          if (costEntry) {
              warning = `Price for ${itemName} in '${region}' not available. Using 'Default' region price.`;
          }
      }

      if (!costEntry) {
          warning = `Price for ${itemName} in '${region}' and 'Default' regions not available. Using library fallback price.`;
      }

      const price = costEntry ? costEntry.price : fallbackPrice;
      const fromCurrency = costEntry ? costEntry.currency : 'USD'; // Assume library price is USD

      const fromRate = CURRENCY_CONVERSION_RATES_TO_USD[fromCurrency] || 1;
      const toRate = CURRENCY_CONVERSION_RATES_TO_USD[currency] || 1; 

      let convertedPrice = price;
      if (fromCurrency !== currency) {
          const priceInUsd = price * fromRate;
          convertedPrice = priceInUsd / toRate;
      }

      return { price: convertedPrice, warning };
  }, [regionCosts, currency]);
  
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

    debounceTimeout.current = window.setTimeout(async () => {
        if (!formData.partNumber.trim()) {
            return;
        }
        setSaveStatus('saving');
        const draftCalculation: Calculation = {
          id: existingCalculation?.id || formData.id,
          inputs: formData,
          status: 'draft',
          user_id: user.id,
          created_at: existingCalculation?.created_at || formData.createdAt,
        };
        await onAutoSaveDraft(draftCalculation);
        setSaveStatus('saved');
    }, 2000);

    return () => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
    }
  }, [formData, onAutoSaveDraft, existingCalculation, user]);

  const selectedMaterial = useMemo(() => materials.find(m => m.id === formData.materialType), [materials, formData.materialType]);
  
  const materialPriceInfo = useMemo(() => {
    if (!formData.materialType || !selectedMaterial) {
      return { price: formData.materialCostPerKg, warning: undefined };
    }
    const libraryCostProp = (selectedMaterial.properties as any)['Cost Per Kg'];
    const libraryCost = libraryCostProp ? Number(libraryCostProp.value) : 0;
    return getPriceInfo(formData.materialType, 'material', formData.region, libraryCost, selectedMaterial.name);
  }, [formData.materialType, formData.region, selectedMaterial, getPriceInfo, formData.materialCostPerKg]);
  
  const pricingWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (materialPriceInfo.warning) {
      warnings.push(materialPriceInfo.warning);
    }
    formData.setups.forEach(setup => {
      if (setup.machineId) {
        const machine = machines.find(m => m.id === setup.machineId);
        if (machine) {
          const { warning } = getPriceInfo(machine.id, 'machine', formData.region, machine.hourlyRate, machine.name);
          if (warning) {
            warnings.push(`Setup '${setup.name}' (${machine.name}): ${warning.replace(`Price for ${machine.name} in `, 'Price in ')}`);
          }
        }
      }
    });
    return warnings;
  }, [materialPriceInfo, formData.setups, formData.region, machines, getPriceInfo]);


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

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRegion = e.target.value;

    const mapping = regionCurrencyMap.find(rc => rc.region === newRegion);
    const defaultMapping = regionCurrencyMap.find(rc => rc.region === 'Default');
    
    // Use region's currency, fallback to Default's currency, then to USD.
    const newCurrency = mapping?.currency || defaultMapping?.currency || 'USD';

    setFormData(prev => ({
        ...prev,
        region: newRegion,
        currency: newCurrency,
    }));
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
        if (!properties) return undefined;
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
        materialCategory: selectedMaterial.category,
        materialCostPerKg: Number(costProp?.value) || 0,
        materialDensityGcm3: Number(densityProp?.value) || 0,
      }));
    } else {
        setFormData(prev => ({...prev, materialType: '', materialCostPerKg: 0, materialDensityGcm3: 0}));
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
    const newSetup: Setup = { id: uuid(), name: `Setup ${formData.setups.length + 1}`, timePerSetupMin: 30, toolChangeTimeSec: 60, efficiency: 0.85, operations: [], description: '', };
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
      const results = calculateMachiningCosts(formData, machines, processes, tools, regionCosts);
      onSave({
        id: existingCalculation?.id || formData.id,
        inputs: formData,
        results: results,
        status: 'final',
        user_id: user.id,
        created_at: existingCalculation?.created_at || formData.createdAt
      });
    }
  };
  
  const handleSaveDraftClick = () => {
    const draftCalculation: Calculation = {
      id: existingCalculation?.id || formData.id,
      inputs: formData,
      status: 'draft',
      user_id: user.id,
      created_at: existingCalculation?.created_at || formData.createdAt,
    };
    onSaveDraft(draftCalculation);
  };
  
  const { rawMaterialCostPerPart, machiningCostPerPart, toolCostPerPart, surfaceTreatmentCostPerPart, totalCostPerPart } = useMemo(() => {
    const results = calculateMachiningCosts(formData, machines, processes, tools, regionCosts);
    return {
      rawMaterialCostPerPart: results.rawMaterialPartCost,
      machiningCostPerPart: formData.batchVolume > 0 ? results.machiningCost / formData.batchVolume : 0,
      toolCostPerPart: formData.batchVolume > 0 ? (results.toolCost || 0) / formData.batchVolume : 0,
      surfaceTreatmentCostPerPart: formData.batchVolume > 0 ? results.surfaceTreatmentCost / formData.batchVolume : 0,
      totalCostPerPart: results.costPerPart,
    };
  }, [formData, machines, processes, tools, regionCosts]);
  
  const markupValuesPerPart = useMemo(() => {
    const baseCost1 = rawMaterialCostPerPart + machiningCostPerPart + toolCostPerPart;
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
  }, [rawMaterialCostPerPart, machiningCostPerPart, toolCostPerPart, surfaceTreatmentCostPerPart, formData.markups]);

  const totalMaterialCostPerKg = useMemo(() => 
    (materialPriceInfo.price || 0) + (formData.transportCostPerKg || 0) + (formData.heatTreatmentCostPerKg || 0),
    [materialPriceInfo.price, formData.transportCostPerKg, formData.heatTreatmentCostPerKg]
  );

  const materialCategories = useMemo(() => Array.from(new Set(materials.map(m => m.category))).sort(), [materials]);
  const filteredMaterialGrades = useMemo(() => {
    if (!formData.materialCategory) return [];
    return materials.filter(m => m.category === formData.materialCategory).sort((a,b) => a.name.localeCompare(b.name));
  }, [materials, formData.materialCategory]);

  const partCostBreakdown = useMemo(() => {
    const processCost = machiningCostPerPart + toolCostPerPart;
    const { general, admin, sales, miscellaneous, packing, profit, duty } = markupValuesPerPart;

    const breakdownItems = [
      { label: 'Raw Material', value: rawMaterialCostPerPart },
      { label: 'Process Cost', value: processCost },
      { label: 'Surface Treatment', value: surfaceTreatmentCostPerPart },
      { label: 'General Overhead', value: general },
      { label: 'Admin Overhead', value: admin },
      { label: 'Sales Overhead', value: sales },
      { label: 'Miscellaneous Overhead', value: miscellaneous },
      { label: 'Packing Overhead', value: packing },
      { label: 'Profit', value: profit },
      { label: 'Duty', value: duty },
    ].filter(item => item.value > 0.005); // Filter out zero or negligible costs

    return breakdownItems;
  }, [rawMaterialCostPerPart, machiningCostPerPart, toolCostPerPart, surfaceTreatmentCostPerPart, markupValuesPerPart]);
  
  const pieChartData = useMemo(() => ({
    labels: partCostBreakdown.map(d => d.label),
    datasets: [
      {
        data: partCostBreakdown.map(d => d.value),
        backgroundColor: [
          '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444',
          '#6366f1', '#84cc16', '#d946ef', '#06b6d4', '#f97316', '#14b8a6'
        ],
        borderColor: theme === 'dark' ? '#1A1A1A' : '#FFFFFF', // surface color
        borderWidth: 2,
      },
    ],
  }), [partCostBreakdown, theme]);

  const pieChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: false,
      },
      legend: {
        position: 'right' as const,
        labels: {
          color: theme === 'dark' ? '#A0A0A0' : '#6B7280', // text-secondary
          boxWidth: 20,
          padding: 15,
          font: {
            size: 12,
          }
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += formatCurrency(context.parsed);
            }
            return label;
          }
        }
      },
      datalabels: {
        formatter: (value: number, ctx: any) => {
            const total = ctx.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
            if (total === 0) return '0%';
            const percentage = (value / total * 100);
            return percentage > 5 ? percentage.toFixed(0) + '%' : '';
        },
        color: '#fff',
        font: {
            weight: 'bold' as const,
        }
      }
    },
  }), [theme, formatCurrency]);


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
                        <Input label="Customer Name" name="customerName" value={formData.customerName || ''} onChange={handleInputChange} />
                        <Input label="Revision" name="revision" value={formData.revision} onChange={handleInputChange} />
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
                        <Select label="Calculation Region" name="region" value={formData.region} onChange={handleRegionChange}>
                          {availableRegions.map(r => <option key={r} value={r}>{r}</option>)}
                        </Select>
                        <DisplayField label="Currency (Auto)" value={formData.currency} />
                        <div className="flex items-end">
                            <div className="p-1 bg-background/50 border border-border rounded-lg flex items-center space-x-1">
                                <Button type="button" onClick={() => handleInputChange({ target: { name: 'unitSystem', value: 'Metric' } } as any)} variant={isMetric ? 'primary' : 'secondary'}>Metric</Button>
                                <Button type="button" onClick={() => handleInputChange({ target: { name: 'unitSystem', value: 'Imperial' } } as any)} variant={!isMetric ? 'primary' : 'secondary'}>Imperial</Button>
                            </div>
                        </div>
                    </div>
                </Card>

                {pricingWarnings.length > 0 && (
                  <Card className="border-yellow-500/50 bg-yellow-500/5">
                      <h3 className="text-yellow-500 font-semibold flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Pricing Warnings
                      </h3>
                      <ul className="list-disc list-inside text-yellow-600 text-sm mt-2 space-y-1">
                          {pricingWarnings.map((warning, i) => <li key={i}>{warning}</li>)}
                      </ul>
                  </Card>
                )}
                
                {/* Material Details */}
                 <Card>
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Material Details</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        <Select label="Material Category" name="materialCategory" value={formData.materialCategory} onChange={(e) => {
                            handleInputChange(e);
                            setFormData(prev => ({ ...prev, materialType: '', materialCostPerKg: 0, materialDensityGcm3: 0 }));
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
                        <DisplayField label="Selected Material" value={selectedMaterial?.name || 'N/A'} />
                        <DisplayField label="Material Cost" value={materialPriceInfo.price.toFixed(2)} unit={`${currencySymbol}/kg`} />
                        <Input label="Transport Cost" name="transportCostPerKg" type="number" step="any" value={formData.transportCostPerKg} onChange={handleInputChange} unit={`${currencySymbol}/kg`} />
                        <Input label="Heat Treatment Cost" name="heatTreatmentCostPerKg" type="number" step="any" value={formData.heatTreatmentCostPerKg} onChange={handleInputChange} unit={`${currencySymbol}/kg`} />
                         <div className="lg:col-span-2">
                            <DisplayField label="Total Material Cost / kg" value={totalMaterialCostPerKg.toFixed(2)} unit={`${currencySymbol}/kg`} />
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
                
                {/* Machining Setups & Operations */}
                <Card>
                    <div className="flex justify-between items-center border-b border-border pb-3 mb-6">
                        <h2 className="text-2xl font-semibold text-primary">Machining Setups</h2>
                        <Button type="button" onClick={addSetup}>+ Add Setup</Button>
                    </div>
                    <div className="space-y-6">
                        {formData.setups.map((setup) => {
                             const selectedMachine = machines.find(m => m.id === setup.machineId);
                             const machinePriceInfo = selectedMachine ? getPriceInfo(selectedMachine.id, 'machine', formData.region, selectedMachine.hourlyRate, selectedMachine.name) : { price: 0 };
                             
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
                                    <DisplayField label="Machine Rate" value={selectedMachine ? formatCurrency(machinePriceInfo.price) : 'N/A'} unit="/hr" />
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
                                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Op. Tool Life (hrs)</th>
                                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Machine Cost</th>
                                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Tool Cost</th>
                                                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-surface divide-y divide-border">
                                                    {setup.operations.map((op, opIndex) => {
                                                        const processDef = processes.find(p => p.name === op.processName);
                                                        const selectedTool = tools.find(t => t.id === op.toolId);
                                                        const time = calculateOperationTime(op, processDef!, selectedTool || null) / (setup.efficiency || 1);
                                                        const machineCost = machinePriceInfo.price > 0 ? (time / 60) * machinePriceInfo.price : 0;
                                                        
                                                        let opToolCost = 0;
                                                        if (selectedTool && selectedTool.price != null && selectedTool.price > 0) {
                                                            const regionalToolPriceInfo = getPriceInfo(selectedTool.id, 'tool', formData.region, selectedTool.price, selectedTool.name);
                                                            const toolLifeHours = op.estimatedToolLifeHours ?? selectedTool.estimatedLife;
                                                            if (toolLifeHours != null && toolLifeHours > 0) {
                                                                const toolLifeMinutes = toolLifeHours * 60;
                                                                opToolCost = (time / toolLifeMinutes) * regionalToolPriceInfo.price;
                                                            }
                                                        }

                                                        return (
                                                            <tr key={op.id} className="hover:bg-background/40">
                                                                <td className="px-3 py-2 text-text-secondary">{opIndex + 1}</td>
                                                                <td className="px-3 py-2 font-semibold text-text-primary">{op.processName}</td>
                                                                <td className="px-3 py-2 text-text-secondary truncate max-w-xs">{selectedTool?.name || 'N/A'}</td>
                                                                <td className="px-3 py-2 text-text-secondary truncate max-w-xs">{formatParameters(op, processDef)}</td>
                                                                <td className="px-3 py-2 text-text-primary font-medium">{time.toFixed(2)} min</td>
                                                                <td className="px-3 py-2 text-text-primary font-medium">{op.estimatedToolLifeHours?.toFixed(1) ?? 'N/A'}</td>
                                                                <td className="px-3 py-2 text-green-500 font-medium">{formatCurrency(machineCost)}</td>
                                                                <td className="px-3 py-2 text-orange-500 font-medium">{formatCurrency(opToolCost)}</td>
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
                                <Input 
                                  label="Cost" 
                                  type="number" 
                                  step="any" 
                                  value={treatment.cost} 
                                  onChange={e => updateSurfaceTreatment(index, 'cost', parseFloat(e.target.value) || 0)}
                                  unit={treatment.unit === 'per_kg' ? `${currencySymbol}/kg` : `${currencySymbol}/${isMetric ? 'm²' : 'ft²'}`}
                                />
                                <Select label="Unit" value={treatment.unit} onChange={e => updateSurfaceTreatment(index, 'unit', e.target.value)}>
                                    <option value="per_kg">per kg</option>
                                    <option value="per_area">per {isMetric ? 'm²' : 'ft²'}</option>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        <DisplayField label="Raw Material Cost" value={formatCurrency(rawMaterialCostPerPart)} />
                        <DisplayField label="Machining Cost" value={formatCurrency(machiningCostPerPart)} />
                        <DisplayField label="Tool Cost" value={formatCurrency(toolCostPerPart)} />
                        <DisplayField label="Surface Treatment Cost" value={formatCurrency(surfaceTreatmentCostPerPart)} />
                    </div>
                </Card>
                
                {/* Markups */}
                <Card>
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Markup</h2>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                             <h3 className="md:col-span-2 text-lg font-semibold text-text-secondary">1. Applied to (Raw Material + Machining + Tool Cost)</h3>
                            <MarkupSlider label="General" name="general" value={formData.markups.general} onChange={handleMarkupChange} />
                            <MarkupSlider label="Admin" name="admin" value={formData.markups.admin} onChange={handleMarkupChange} />
                            <MarkupSlider label="Sales" name="sales" value={formData.markups.sales} onChange={handleMarkupChange} />
                            <MarkupSlider label="Miscellaneous" name="miscellaneous" value={formData.markups.miscellaneous} onChange={handleMarkupChange} />
                        </div>
                        <div className="border-t border-border pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <h3 className="md:col-span-2 text-lg font-semibold text-text-secondary">2. Applied to (Raw Material + Machining + Tool + Surface Treatment)</h3>
                           <MarkupSlider label="Packing" name="packing" value={formData.markups.packing} onChange={handleMarkupChange} />
                           <MarkupSlider label="Transport" name="transport" value={formData.markups.transport} onChange={handleMarkupChange} />
                           <MarkupSlider label="Duty" name="duty" value={formData.markups.duty} onChange={handleMarkupChange} />
                           <MarkupSlider label="Profit" name="profit" value={formData.markups.profit} onChange={handleMarkupChange} />
                        </div>
                    </div>
                </Card>

                {/* Part Cost Breakup */}
                <Card>
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Part Cost Breakup</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        <div className="space-y-2">
                            {partCostBreakdown.map((item) => (
                                <div key={item.label} className="flex justify-between items-center py-2 px-3 rounded-md bg-background/50">
                                    <span className="text-text-secondary">{item.label}</span>
                                    <span className="font-semibold text-text-primary">{formatCurrency(item.value)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center py-3 px-3 rounded-md bg-surface border-t-2 border-primary mt-2">
                                <span className="font-bold text-primary">Total Cost / Part</span>
                                <span className="font-bold text-primary text-lg">{formatCurrency(totalCostPerPart)}</span>
                            </div>
                        </div>
                        <div className="h-80 relative">
                            <Pie data={pieChartData} options={pieChartOptions} />
                        </div>
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