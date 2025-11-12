import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { DisplayField } from './ui/DisplayField';
import { Card } from './ui/Card';
import { CloseIcon } from './ui/CloseIcon';
import type { Operation, Process, ProcessParameter, Tool, Machine, Setup } from '../types';
import { calculateOperationTime } from '../services/calculationService';
import { ToolSelectionModal } from './ToolSelectionModal';
import { calculateOperationToolLife } from '../services/geminiService';

const uuid = () => `id_${Math.random().toString(36).substring(2, 9)}`;

interface OperationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (setupId: string, operation: Operation) => void;
    setup: Setup;
    operationToEdit: Operation | null;
    processes: Process[];
    tools: Tool[];
    machines: Machine[];
    isMetric: boolean;
    getDisplayValue: (metricValue: number, metricUnit: string) => number;
    getMetricValue: (displayValue: number, imperialUnit: string) => number;
    formatCurrency: (value: number) => string;
}

export const OperationModal: React.FC<OperationModalProps> = ({
    isOpen, onClose, onSave, setup, operationToEdit,
    processes, tools, machines, isMetric, getDisplayValue, getMetricValue, formatCurrency
}) => {
    const [formData, setFormData] = useState<Partial<Operation>>({});
    const [isToolModalOpen, setIsToolModalOpen] = useState(false);
    const [isCalculatingLife, setIsCalculatingLife] = useState(false);

    const machineForSetup = useMemo(() => machines.find(m => m.id === setup.machineId), [setup.machineId, machines]);
    const availableProcesses = useMemo(() => machineForSetup ? processes.filter(p => p.compatibleMachineTypes.includes(machineForSetup.machineType)) : [], [machineForSetup, processes]);
    
    // Initialize form data
    useEffect(() => {
        if (isOpen) {
            if (operationToEdit) {
                setFormData(operationToEdit);
            } else {
                // Set default for a new operation
                const defaultProcessName = availableProcesses[0]?.name || '';
                setFormData({
                    processName: defaultProcessName,
                    parameters: {},
                });
            }
        }
    }, [isOpen, operationToEdit, availableProcesses]);
    
    const selectedTool = useMemo(() => tools.find(t => t.id === formData.toolId), [formData.toolId, tools]);
    const processDef = useMemo(() => processes.find(p => p.name === formData.processName), [formData.processName, processes]);
    const isTurningProcess = processDef?.group === 'Turning';

    const handleProcessChange = (newProcessName: string) => {
        // Keep tool and overrides, but reset process-specific params
        const newParameters = {
            cuttingSpeed: formData.parameters?.cuttingSpeed,
            feedPerTooth: formData.parameters?.feedPerTooth,
            feedPerRev: formData.parameters?.feedPerRev,
        };
        setFormData(prev => ({ ...prev, processName: newProcessName, parameters: newParameters }));
    };

    const handleToolSelect = (tool: Tool) => {
        const newParameters = { ...formData.parameters };
        newParameters.cuttingSpeed = tool.cuttingSpeedVc || 0;
        
        // Populate the correct feed parameter based on process type
        if (isTurningProcess) {
             newParameters.feedPerRev = tool.feedPerTooth || 0; // Lathe tools use feedPerTooth field for feedPerRev
        } else {
            newParameters.feedPerTooth = tool.feedPerTooth || 0;
        }

        setFormData(prev => ({
            ...prev,
            toolId: tool.id,
            toolName: tool.name,
            parameters: newParameters,
            estimatedToolLifeHours: undefined, // Reset op-specific life
        }));
        setIsToolModalOpen(false);
    };

    const updateParameter = (paramName: string, value: string, metricUnit: string) => {
        const displayValue = parseFloat(value) || 0;
        const metricValue = getMetricValue(displayValue, metricUnit);
        setFormData(prev => ({
            ...prev,
            parameters: { ...prev.parameters, [paramName]: metricValue }
        }));
    };
    
    const handleCalculateOpLife = async () => {
        if (!selectedTool || !processDef) return;
        setIsCalculatingLife(true);
        const currentOperation: Operation = { ...formData, id: 'temp' } as Operation;
        try {
            const life = await calculateOperationToolLife(selectedTool, currentOperation, processDef);
            if (life !== null) {
                setFormData(prev => ({ ...prev, estimatedToolLifeHours: life }));
            } else {
                alert("Could not calculate tool life for this operation.");
            }
        } catch (error) {
            console.error("Error during op tool life calc:", error);
            alert("An error occurred while calculating tool life.");
        } finally {
            setIsCalculatingLife(false);
        }
    };

    const handleSave = () => {
        const opId = operationToEdit?.id || uuid();
        const opToSave: Operation = {
            id: opId,
            processName: formData.processName || '',
            parameters: formData.parameters || {},
            toolId: formData.toolId,
            toolName: selectedTool?.name,
            estimatedToolLifeHours: formData.estimatedToolLifeHours,
        };
        onSave(setup.id, opToSave);
    };
    
    // Memoized calculated values for display
    const { effectiveOpTimeMin, opMachineCost, opToolCost, calculatedRpm, calculatedFeedRate } = useMemo(() => {
        if (!processDef || !machineForSetup) return { effectiveOpTimeMin: 0, opMachineCost: 0, opToolCost: 0, calculatedRpm: 0, calculatedFeedRate: 0 };
        
        const operationData = { ...formData } as Operation;
        const rawTime = calculateOperationTime(operationData, processDef, selectedTool || null);
        const effectiveOpTimeMin = rawTime / (setup.efficiency || 1);
        const opMachineCost = (effectiveOpTimeMin / 60) * machineForSetup.hourlyRate;
        
        let opToolCost = 0;
        if (selectedTool?.price && selectedTool.price > 0) {
            const toolLifeHours = formData.estimatedToolLifeHours ?? selectedTool.estimatedLife;
            if (toolLifeHours && toolLifeHours > 0) {
                const toolCostPerMin = selectedTool.price / (toolLifeHours * 60);
                opToolCost = toolCostPerMin * effectiveOpTimeMin;
            }
        }
        
        const vc = operationData.parameters?.cuttingSpeed ?? selectedTool?.cuttingSpeedVc ?? 0;
        const dia = selectedTool?.diameter ?? 0;
        const rpm = (dia > 0 && vc > 0) ? Math.round((vc * 1000) / (Math.PI * dia)) : 0;
        
        let feedRate = 0;
        if (isTurningProcess) {
            const f_rev = operationData.parameters?.feedPerRev ?? selectedTool?.feedPerTooth ?? 0;
            if (rpm > 0 && f_rev > 0) feedRate = rpm * f_rev;
        } else {
            const fpt = operationData.parameters?.feedPerTooth ?? selectedTool?.feedPerTooth ?? 0;
            const teeth = selectedTool?.numberOfTeeth ?? 0;
            if (rpm > 0 && fpt > 0 && teeth > 0) feedRate = Math.round(rpm * fpt * teeth);
        }

        return { effectiveOpTimeMin, opMachineCost, opToolCost, calculatedRpm: rpm, calculatedFeedRate: feedRate };
    }, [formData, processDef, selectedTool, setup.efficiency, machineForSetup, isTurningProcess]);
    
    if (!isOpen || !machineForSetup) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
            {isToolModalOpen && (
                <ToolSelectionModal
                    isOpen={isToolModalOpen}
                    onClose={() => setIsToolModalOpen(false)}
                    onSelect={handleToolSelect}
                    tools={tools}
                    machineType={machineForSetup.machineType}
                />
            )}
            <Card className="max-w-3xl w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
                    <CloseIcon />
                </button>
                <h2 className="text-2xl font-bold text-primary mb-6">{operationToEdit ? 'Edit Operation' : 'Add New Operation'}</h2>
                
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                    {/* Section 1: Process and Tool Selection */}
                    <div className="space-y-4">
                        <Select label="1. Select Process" value={formData.processName || ''} onChange={e => handleProcessChange(e.target.value)}>
                            {availableProcesses.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </Select>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                            <DisplayField label="2. Select Tool" value={selectedTool?.name || 'N/A'} />
                            <Button type="button" onClick={() => setIsToolModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white self-end h-10">
                                {selectedTool ? 'Change Tool' : 'Select Tool'}
                            </Button>
                        </div>
                    </div>

                    {/* Section 2: Cutting Parameter Overrides */}
                    <div className="border-t border-border pt-4">
                        <h3 className="text-lg font-semibold text-text-primary mb-2">3. Cutting Parameter Overrides</h3>
                        <p className="text-sm text-text-muted mb-3">These values override the selected tool's defaults. The correct feed type is shown based on the process group.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label={isMetric ? "Cutting Speed (Vc)" : "Surface Speed (SFM)"}
                                type="number" step="any"
                                value={getDisplayValue(formData.parameters?.cuttingSpeed || 0, 'm/min')}
                                onChange={e => updateParameter('cuttingSpeed', e.target.value, 'm/min')}
                                unit={isMetric ? "m/min" : "sfm"}
                                placeholder={selectedTool?.cuttingSpeedVc?.toString() || "e.g., 120"}
                            />
                            {isTurningProcess ? (
                                <Input
                                    label="Feed per Revolution"
                                    type="number" step="any"
                                    value={getDisplayValue(formData.parameters?.feedPerRev || 0, 'mm')}
                                    onChange={e => updateParameter('feedPerRev', e.target.value, 'mm')}
                                    unit={isMetric ? "mm/rev" : "in/rev"}
                                    placeholder={selectedTool?.feedPerTooth?.toString() || "e.g., 0.2"}
                                />
                            ) : (
                                <Input
                                    label="Feed per Tooth"
                                    type="number" step="any"
                                    value={getDisplayValue(formData.parameters?.feedPerTooth || 0, 'mm')}
                                    onChange={e => updateParameter('feedPerTooth', e.target.value, 'mm')}
                                    unit={isMetric ? "mm" : "in"}
                                    placeholder={selectedTool?.feedPerTooth?.toString() || "e.g., 0.05"}
                                />
                            )}
                        </div>
                    </div>

                    {/* Section 3: Process Parameters */}
                    {processDef && (processDef.parameters as ProcessParameter[]).length > 0 && (
                        <div className="border-t border-border pt-4">
                            <h3 className="text-lg font-semibold text-text-primary mb-2">4. Process Parameters</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {(processDef.parameters as ProcessParameter[]).map(p => {
                                    const label = isMetric ? p.label : (p.imperialLabel || p.label);
                                    const unit = isMetric ? p.unit : (p.imperialUnit || p.unit);
                                    const displayValue = getDisplayValue(formData.parameters?.[p.name] || 0, p.unit);
                                    return (
                                        <Input key={p.name} label={label} type="number" step="any" value={displayValue} onChange={e => updateParameter(p.name, e.target.value, p.unit)} unit={unit} />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {/* Section 4: Tool Life */}
                    <div className="border-t border-border pt-4">
                        <h3 className="text-lg font-semibold text-text-primary mb-2">5. Operation-Specific Tool Life</h3>
                        <p className="text-sm text-text-muted mb-3">Calculate a more accurate tool life based on the specific cutting parameters for this operation.</p>
                        <div className="grid grid-cols-2 gap-4 items-end">
                            <DisplayField label="Op. Tool Life (AI)" value={formData.estimatedToolLifeHours !== undefined ? `${formData.estimatedToolLifeHours} hrs` : (selectedTool?.estimatedLife ? `${selectedTool.estimatedLife} hrs (default)` : 'N/A')} />
                            <Button type="button" onClick={handleCalculateOpLife} disabled={isCalculatingLife || !selectedTool}>
                                {isCalculatingLife ? 'Calculating...' : 'Calculate Life (AI)'}
                            </Button>
                        </div>
                    </div>

                    {/* Section 5: Calculated Values */}
                    <div className="border-t border-border pt-4 space-y-4">
                        <h3 className="text-lg font-semibold text-text-primary">Calculated Values</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <DisplayField label="Calculated Speed" value={calculatedRpm} unit="RPM" />
                            <DisplayField label="Calculated Feed Rate" value={getDisplayValue(calculatedFeedRate, 'mm/min').toFixed(0)} unit={isMetric ? "mm/min" : "in/min"} />
                            <DisplayField label="Est. Time" value={`${effectiveOpTimeMin.toFixed(2)} min`} className="text-blue-600 font-bold" />
                            <DisplayField label="Est. Machine Cost" value={formatCurrency(opMachineCost)} className="text-green-600 font-bold" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-border">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>
                        {operationToEdit ? 'Save Changes' : 'Add Operation'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};
