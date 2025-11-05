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
    const [processName, setProcessName] = useState('');
    const [toolId, setToolId] = useState<string | undefined>();
    const [parameters, setParameters] = useState<{ [key: string]: number }>({});
    const [isToolModalOpen, setIsToolModalOpen] = useState(false);

    const machineForSetup = useMemo(() => machines.find(m => m.id === setup.machineId), [setup.machineId, machines]);
    const availableProcesses = useMemo(() => machineForSetup ? processes.filter(p => p.compatibleMachineTypes.includes(machineForSetup.machineType)) : [], [machineForSetup, processes]);
    
    useEffect(() => {
        if (isOpen) {
            const initialProcessName = operationToEdit?.processName || availableProcesses[0]?.name || '';
            setProcessName(initialProcessName);
            setToolId(operationToEdit?.toolId);

            const processDef = processes.find(p => p.name === initialProcessName);
            const processParams = (processDef?.parameters as ProcessParameter[]) || [];
            const initialParams = processParams.reduce((acc, p) => ({
                ...acc,
                [p.name]: operationToEdit?.parameters[p.name] || 0
            }), {});
            setParameters(initialParams);
        }
    }, [isOpen, operationToEdit, availableProcesses, processes]);
    
    const handleProcessChange = useCallback((newProcessName: string) => {
        setProcessName(newProcessName);
        const processDef = processes.find(p => p.name === newProcessName);
        const processParams = (processDef?.parameters as ProcessParameter[]) || [];
        // Preserve existing parameter values if their names match
        const newParameters = processParams.reduce((acc, p) => ({ ...acc, [p.name]: parameters[p.name] || 0 }), {});
        setParameters(newParameters);
    }, [processes, parameters]);

    const updateParameter = (param: ProcessParameter, value: string) => {
        const displayValue = parseFloat(value) || 0;
        const metricValue = getMetricValue(displayValue, param.imperialUnit || param.unit);
        setParameters(prev => ({ ...prev, [param.name]: metricValue }));
    };

    const handleToolSelect = (tool: Tool) => {
        setToolId(tool.id);
        setIsToolModalOpen(false);
    };

    const handleSave = () => {
        const opId = operationToEdit?.id || uuid();
        const selectedTool = tools.find(t => t.id === toolId);
        const opToSave: Operation = {
            id: opId,
            processName,
            parameters,
            toolId,
            toolName: selectedTool?.name,
        };
        onSave(setup.id, opToSave);
    };
    
    if (!isOpen || !machineForSetup) return null;

    const processDef = processes.find(p => p.name === processName);
    const processParams = (processDef?.parameters as ProcessParameter[]) || [];
    const selectedTool = tools.find(t => t.id === toolId);

    const operationData: Operation = useMemo(() => ({
        id: operationToEdit?.id || '',
        processName,
        parameters,
        toolId
    }), [operationToEdit, processName, parameters, toolId]);

    const calculatedRpm = useMemo(() => {
        const vc = parameters.cuttingSpeed ?? selectedTool?.cuttingSpeedVc ?? 0;
        const dia = selectedTool?.diameter ?? 0;
        if (dia > 0 && vc > 0) return Math.round((vc * 1000) / (Math.PI * dia));
        return 0;
    }, [parameters, selectedTool]);

    const calculatedFeedRate = useMemo(() => {
        const fpt = parameters.feedPerTooth ?? selectedTool?.feedPerTooth ?? 0;
        const teeth = selectedTool?.numberOfTeeth ?? 0;
        if (calculatedRpm > 0 && fpt > 0 && teeth > 0) return Math.round(calculatedRpm * fpt * teeth);
        return 0;
    }, [calculatedRpm, parameters, selectedTool]);

    const effectiveOpTimeMin = useMemo(() => {
        if (!processDef) return 0;
        const rawTime = calculateOperationTime(operationData, processDef, selectedTool || null);
        return rawTime / (setup.efficiency || 1);
    }, [operationData, processDef, selectedTool, setup.efficiency]);

    const opCost = useMemo(() => (effectiveOpTimeMin / 60) * machineForSetup.hourlyRate, [effectiveOpTimeMin, machineForSetup]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
            <ToolSelectionModal
                isOpen={isToolModalOpen}
                onClose={() => setIsToolModalOpen(false)}
                onSelect={handleToolSelect}
                tools={tools}
                machineType={machineForSetup.machineType}
            />
            <Card className="max-w-3xl w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
                    <CloseIcon />
                </button>
                <h2 className="text-2xl font-bold text-primary mb-6">{operationToEdit ? 'Edit Operation' : 'Add New Operation'}</h2>
                
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                    <Select label="Process" value={processName} onChange={e => handleProcessChange(e.target.value)}>
                        {availableProcesses.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </Select>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-border pt-4">
                        {processParams.map(p => {
                            const label = isMetric ? p.label : (p.imperialLabel || p.label);
                            const unit = isMetric ? p.unit : (p.imperialUnit || p.unit);
                            const displayValue = getDisplayValue(parameters[p.name] || 0, p.unit);
                            return (
                                <Input
                                    key={p.name}
                                    label={label}
                                    type="number"
                                    step="any"
                                    value={displayValue}
                                    onChange={e => updateParameter(p, e.target.value)}
                                    unit={unit}
                                />
                            );
                        })}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3 pt-3 border-t border-border/50">
                        <DisplayField label="Tool" value={selectedTool?.name || 'N/A'} className="md:col-span-1" />
                        <DisplayField label="Speed" value={calculatedRpm} unit="RPM" />
                        <DisplayField label="Feed Rate" value={getDisplayValue(calculatedFeedRate, 'mm/min').toFixed(0)} unit={isMetric ? "mm/min" : "in/min"} />
                    </div>

                    <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
                        <div className="flex items-center space-x-6">
                            <div className="text-center">
                                <div className="text-sm text-text-secondary">Est. Time</div>
                                <div className="text-lg font-bold text-blue-600">{effectiveOpTimeMin.toFixed(2)} min</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-text-secondary">Est. Cost</div>
                                <div className="text-lg font-bold text-green-600">{formatCurrency(opCost)}</div>
                            </div>
                        </div>
                         <Button type="button" onClick={() => setIsToolModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {selectedTool ? 'Change Tool' : 'Select Tool'}
                        </Button>
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
