
import React, { useState, useMemo } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { DisplayField } from './ui/DisplayField';
import type { Operation, Process, Tool, ProcessParameter, Setup, Machine } from '../types';
import { calculateOperationTime } from '../services/calculationService';
import { calculateOperationToolLife } from '../services/geminiService';

interface StandardOperationFormProps {
    formData: Partial<Operation>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Operation>>>;
    process: Process;
    setup: Setup;
    machine: Machine;
    tools: Tool[];
    onToolClick: () => void;
    isMetric: boolean;
    getDisplayValue: (val: number, unit: string) => number;
    getMetricValue: (val: number, unit: string) => number;
    formatCurrency: (val: number) => string;
}

export const StandardOperationForm: React.FC<StandardOperationFormProps> = ({
    formData, setFormData, process, setup, machine, tools, onToolClick,
    isMetric, getDisplayValue, getMetricValue, formatCurrency
}) => {
    const [isCalculatingLife, setIsCalculatingLife] = useState(false);
    
    const selectedTool = useMemo(() => tools.find(t => t.id === formData.toolId), [formData.toolId, tools]);
    const isTurningProcess = process.group === 'Turning';

    // Determine if values are overridden relative to the selected tool defaults
    const isOverriding = useMemo(() => {
        if (!selectedTool) return false;
        const currentSpeed = formData.parameters?.cuttingSpeed;
        const currentFeed = isTurningProcess ? formData.parameters?.feedPerRev : formData.parameters?.feedPerTooth;
        const toolSpeed = selectedTool.cuttingSpeedVc;
        const toolFeed = selectedTool.feedPerTooth; // Note: feedPerTooth stores feedPerRev for lathe tools in DB

        return (currentSpeed !== undefined && currentSpeed !== toolSpeed) || 
               (currentFeed !== undefined && currentFeed !== toolFeed);
    }, [formData.parameters, selectedTool, isTurningProcess]);

    const handleParamChange = (name: string, value: string, unit: string) => {
        const displayValue = parseFloat(value);
        const metricValue = isNaN(displayValue) ? 0 : getMetricValue(displayValue, unit);
        
        setFormData(prev => ({
            ...prev,
            parameters: {
                ...prev.parameters,
                [name]: metricValue
            }
        }));
    };

    const handleToggleOverride = () => {
        if (isOverriding && selectedTool) {
            // Reset to defaults
            setFormData(prev => ({
                ...prev,
                parameters: {
                    ...prev.parameters,
                    cuttingSpeed: selectedTool.cuttingSpeedVc || 0,
                    [isTurningProcess ? 'feedPerRev' : 'feedPerTooth']: selectedTool.feedPerTooth || 0
                }
            }));
        }
    };

    const handleCalculateOpLife = async () => {
        if (!selectedTool) return;
        setIsCalculatingLife(true);
        try {
            const life = await calculateOperationToolLife(selectedTool, formData as Operation, process);
            if (life !== null) {
                setFormData(prev => ({ ...prev, estimatedToolLifeHours: life }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsCalculatingLife(false);
        }
    };

    // Live Calculations
    const { cycleTime, machineCost, toolCost, calculatedRpm, calculatedFeedRate } = useMemo(() => {
        const op = formData as Operation;
        const rawTime = calculateOperationTime(op, process, selectedTool || null);
        const time = rawTime / (setup.efficiency || 1);
        const mCost = (time / 60) * machine.hourlyRate;
        
        let tCost = 0;
        if (selectedTool?.price && selectedTool.price > 0) {
            const life = formData.estimatedToolLifeHours ?? selectedTool.estimatedLife;
            if (life && life > 0) {
                tCost = (time / (life * 60)) * selectedTool.price;
            }
        }

        // RPM & Feed Display
        const vc = op.parameters?.cuttingSpeed ?? 0;
        const dia = selectedTool?.diameter ?? 0; // Or workpiece dia for turning, typically derived in calc service but simple approximation here for display
        
        // Re-derive RPM for display purposes. Note: calculateOperationTime does this internally more robustly.
        // We'll use a simple approximation for the UI.
        let rpm = 0;
        let feedRate = 0;

        // For Turning, RPM depends on diameterStart/End usually.
        // For Milling, RPM depends on Tool Diameter.
        const diameterForRpm = isTurningProcess 
            ? (op.parameters?.diameterStart ?? op.parameters?.facingDiameter ?? op.parameters?.partingDiameter ?? 0) 
            : dia;
            
        if (vc > 0 && diameterForRpm > 0) {
             rpm = (vc * 1000) / (Math.PI * diameterForRpm);
        }
        
        if (rpm > 0) {
             const feedParam = isTurningProcess ? (op.parameters?.feedPerRev ?? 0) : (op.parameters?.feedPerTooth ?? 0);
             const teeth = isTurningProcess ? 1 : (selectedTool?.numberOfTeeth ?? 1);
             feedRate = rpm * feedParam * teeth;
        }
        
        // If calculateOperationTime returned valid time but our simple UI math failed (e.g. complex formula), 
        // we rely on time.

        return { cycleTime: time, machineCost: mCost, toolCost: tCost, calculatedRpm: Math.round(rpm), calculatedFeedRate: Math.round(feedRate) };
    }, [formData, process, selectedTool, setup.efficiency, machine, isTurningProcess]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            {/* LEFT COLUMN: INPUTS */}
            <div className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-text-primary border-b border-border pb-2">1. Operation Parameters</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(process.parameters as ProcessParameter[]).map(param => (
                            <Input
                                key={param.name}
                                label={isMetric ? param.label : (param.imperialLabel || param.label)}
                                type="number"
                                step="any"
                                value={getDisplayValue(formData.parameters?.[param.name] || 0, param.unit)}
                                onChange={e => handleParamChange(param.name, e.target.value, param.unit)}
                                unit={isMetric ? param.unit : (param.imperialUnit || param.unit)}
                            />
                        ))}
                    </div>
                </div>

                {/* Cutting Data Section - Moved to Left for better flow with inputs */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-border pb-2">
                        <h3 className="text-lg font-semibold text-text-primary">2. Cutting Data</h3>
                         {selectedTool && isOverriding && (
                            <button onClick={handleToggleOverride} className="text-xs text-primary hover:underline">
                                Reset to Tool Defaults
                            </button>
                        )}
                    </div>
                    
                    {!selectedTool ? (
                         <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 text-sm">
                            Please select a tool to view and edit cutting data.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label={isMetric ? "Cutting Speed (Vc)" : "Surface Speed (SFM)"}
                                type="number" step="any"
                                value={getDisplayValue(formData.parameters?.cuttingSpeed || 0, 'm/min')}
                                onChange={e => handleParamChange('cuttingSpeed', e.target.value, 'm/min')}
                                unit={isMetric ? "m/min" : "sfm"}
                            />
                            <Input
                                label={isTurningProcess ? "Feed per Rev" : "Feed per Tooth"}
                                type="number" step="any"
                                value={getDisplayValue(isTurningProcess ? (formData.parameters?.feedPerRev || 0) : (formData.parameters?.feedPerTooth || 0), 'mm')}
                                onChange={e => handleParamChange(isTurningProcess ? 'feedPerRev' : 'feedPerTooth', e.target.value, 'mm')}
                                unit={isMetric ? (isTurningProcess ? "mm/rev" : "mm") : (isTurningProcess ? "in/rev" : "in")}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: TOOL & RESULTS */}
            <div className="space-y-6">
                {/* Tool Selection Card */}
                <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-text-primary">3. Tool Selection</h3>
                        <Button type="button" onClick={onToolClick} className="!py-1.5 !px-3 text-sm">
                            {selectedTool ? 'Change' : 'Select'}
                        </Button>
                    </div>
                    
                    {selectedTool ? (
                         <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                            <div className="col-span-2 font-medium text-primary text-base mb-1">{selectedTool.name}</div>
                            <div className="flex justify-between"><span className="text-text-secondary">Type:</span> <span>{selectedTool.toolType}</span></div>
                            <div className="flex justify-between"><span className="text-text-secondary">Material:</span> <span>{selectedTool.material}</span></div>
                            <div className="flex justify-between"><span className="text-text-secondary">Diameter:</span> <span>{selectedTool.diameter} mm</span></div>
                            <div className="flex justify-between"><span className="text-text-secondary">Teeth:</span> <span>{selectedTool.numberOfTeeth || '-'}</span></div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-text-muted italic bg-background/50 rounded-lg">
                            No tool selected.
                        </div>
                    )}
                </div>

                {/* Results Card */}
                <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                     <h3 className="text-lg font-semibold text-text-primary mb-4 border-b border-border pb-2">4. Live Results</h3>
                     
                     {/* Main Cycle Time */}
                     <div className="mb-6 text-center p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <span className="block text-text-secondary text-sm uppercase tracking-wider font-semibold mb-1">Cycle Time</span>
                        <span className="block text-4xl font-bold text-primary">{cycleTime.toFixed(2)} <span className="text-xl font-normal text-text-muted">min</span></span>
                     </div>

                     {/* Cost Grid */}
                     <div className="grid grid-cols-2 gap-4 mb-6">
                        <DisplayField label="Machine Cost" value={formatCurrency(machineCost)} className="text-green-600 font-semibold" />
                        <DisplayField label="Tool Cost" value={formatCurrency(toolCost)} className="text-orange-600 font-semibold" />
                     </div>

                     {/* Derived Data */}
                     <div className="space-y-3 border-t border-border pt-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-text-secondary">Calculated RPM:</span>
                            <span className="font-mono font-medium">{calculatedRpm}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-text-secondary">Calculated Feed Rate:</span>
                            <span className="font-mono font-medium">{calculatedFeedRate} {isMetric ? 'mm/min' : 'in/min'}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm pt-2">
                            <span className="text-text-secondary">Tool Life (Operation):</span>
                            <div className="flex items-center gap-2">
                                <span className="font-mono font-medium">
                                    {formData.estimatedToolLifeHours ? formData.estimatedToolLifeHours.toFixed(1) : (selectedTool?.estimatedLife || '-')} hrs
                                </span>
                                <button 
                                    onClick={handleCalculateOpLife} 
                                    disabled={isCalculatingLife || !selectedTool}
                                    className="text-xs bg-primary text-white px-2 py-0.5 rounded hover:bg-primary-hover disabled:opacity-50"
                                >
                                    {isCalculatingLife ? '...' : 'AI Calc'}
                                </button>
                            </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};
