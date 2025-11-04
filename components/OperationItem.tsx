import React, { useMemo } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { DisplayField } from './ui/DisplayField';
import { CloseIcon } from './ui/CloseIcon';
import type { OperationItemProps, Process, ProcessParameter, Tool } from '../types';
import { calculateOperationTime } from '../services/calculationService';

export const OperationItem: React.FC<OperationItemProps> = ({
  setup,
  op,
  isMetric,
  getDisplayValue,
  getMetricValue,
  updateOperation,
  updateOperationParameter,
  removeOperation,
  handleOpenToolModal,
  processes,
  tools,
  machines,
  formatCurrency,
}) => {
    const processDef = processes.find(p => p.name === op.processName);
    const processParams = useMemo(() => {
        if (processDef && Array.isArray(processDef.parameters)) {
            return processDef.parameters as ProcessParameter[];
        }
        return [];
    }, [processDef]);
    
    const selectedTool = op.toolId ? tools.find(t => t.id === op.toolId) : null;

    const { cutterDiameter = op.parameters.holeDiameter || 0, cuttingSpeed = 0, feedPerTooth = 0, numberOfTeeth = 0, feedPerRev = 0, diameter = 0, } = op.parameters;
    const opDiameter = cutterDiameter || diameter;

    const calculatedRpm = useMemo(() => {
        const vc = op.parameters.cuttingSpeed ?? selectedTool?.cuttingSpeedVc ?? 0;
        const dia = op.parameters.cutterDiameter ?? selectedTool?.diameter ?? 0;
        if (dia > 0 && vc > 0) {
            return Math.round((vc * 1000) / (Math.PI * dia));
        } return 0;
    }, [op.parameters, selectedTool]);

    const calculatedFeedRate = useMemo(() => {
        const fpt = op.parameters.feedPerTooth ?? selectedTool?.feedPerTooth ?? 0;
        const teeth = op.parameters.numberOfTeeth ?? selectedTool?.numberOfTeeth ?? 0;
        if (calculatedRpm > 0 && fpt > 0 && teeth > 0) {
            return Math.round(calculatedRpm * fpt * teeth);
        } if (calculatedRpm > 0 && feedPerRev > 0) {
            return Math.round(calculatedRpm * feedPerRev);
        } return 0;
    }, [calculatedRpm, op.parameters, selectedTool, feedPerRev]);
    
    const rawOpTimeMin = useMemo(() => {
        if (!processDef) return 0;
        return calculateOperationTime(op, processDef, selectedTool);
    }, [op, processDef, selectedTool]);
    
    const effectiveOpTimeMin = useMemo(() => {
        if (rawOpTimeMin <= 0) return 0;
        const efficiencyDivisor = (setup.efficiency > 0 && setup.efficiency <= 1) ? setup.efficiency : 1;
        return rawOpTimeMin / efficiencyDivisor;
    }, [rawOpTimeMin, setup.efficiency]);
    
    const machineForSetup = useMemo(() => machines.find(m => m.id === setup.machineId), [setup.machineId, machines]);
    
    const opCost = useMemo(() => {
        if (!machineForSetup || effectiveOpTimeMin <= 0) return 0;
        return (effectiveOpTimeMin / 60) * machineForSetup.hourlyRate;
    }, [effectiveOpTimeMin, machineForSetup]);
    
    const machineForSetupForProcesses = machines.find(m => m.id === setup.machineId);
    const availableProcessesForSetup = machineForSetupForProcesses ? processes.filter(p => p.compatibleMachineTypes.includes(machineForSetupForProcesses.machineType)) : [];

    const hasDirectFeedRateParam = processParams.some(p => p.name === 'feedRate');
    const hasSpindleSpeedParam = processParams.some(p => p.name === 'spindleSpeed');

    return (
        <div className="bg-surface p-3 rounded-md border border-border relative">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div className="col-span-full">
                    <Select label="Process" value={op.processName} onChange={e => updateOperation(setup.id, op.id, 'processName', e.target.value)} disabled={!setup.machineId}>
                        {!setup.machineId && <option>Please select a machine first</option>}
                        {setup.machineId && availableProcessesForSetup.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </Select>
                </div>
                {processParams.map(p => {
                    const label = isMetric ? p.label : (p.imperialLabel || p.label);
                    const unit = isMetric ? p.unit : (p.imperialUnit || p.unit);
                    const displayValue = getDisplayValue(op.parameters[p.name] || 0, p.unit);
                    
                    if (selectedTool && (p.name === 'cuttingSpeed' || p.name === 'feedPerTooth' || p.name === 'feedPerRev')) {
                        const toolValue = p.name === 'cuttingSpeed' ? selectedTool.cuttingSpeedVc : selectedTool.feedPerTooth;
                        const baseValue = toolValue || (p.name === 'cuttingSpeed' ? 100 : 0.1);
                        const minVal = getDisplayValue(baseValue * 0.8, p.unit);
                        const maxVal = getDisplayValue(baseValue * 1.2, p.unit);
                        const step = (maxVal - minVal) / 100 || 0.001;

                        return (
                            <div key={p.name} className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-secondary mb-1 flex justify-between">
                                    <span>{label}</span>
                                    <span className="font-semibold text-text-primary">{displayValue.toFixed(p.name === 'cuttingSpeed' ? 0 : 3)} {unit}</span>
                                </label>
                                <input
                                    type="range"
                                    min={minVal}
                                    max={maxVal}
                                    step={step}
                                    value={displayValue}
                                    onChange={e => updateOperationParameter(setup.id, op.id, p, e.target.value)}
                                    className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                        );
                    }

                    return (
                        <Input 
                            key={p.name}
                            label={label}
                            type="number"
                            step="any"
                            value={displayValue}
                            onChange={e => updateOperationParameter(setup.id, op.id, p, e.target.value)}
                            unit={unit}
                        />
                    );
                })}
            </div>
            {selectedTool && !hasDirectFeedRateParam && !hasSpindleSpeedParam ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border/50">
                    <DisplayField label="Tool" value={selectedTool.name} className="md:col-span-2" />
                    <DisplayField label="Speed" value={calculatedRpm} unit="RPM" />
                    <DisplayField label="Feed Rate" value={getDisplayValue(calculatedFeedRate, 'mm/min').toFixed(0)} unit={isMetric ? "mm/min" : "in/min"} />
                </div>
            ) : null}
             <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
                <div className="flex items-center space-x-6">
                    <div className="text-center">
                        <div className="text-sm text-text-secondary">Est. Operation Time</div>
                        <div className="text-lg font-bold text-blue-600">{effectiveOpTimeMin.toFixed(2)} min</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-text-secondary">Est. Operation Cost</div>
                        <div className="text-lg font-bold text-green-600">{formatCurrency(opCost)}</div>
                    </div>
                </div>
                <Button type="button" onClick={() => handleOpenToolModal(setup.id, op.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {selectedTool ? 'Change Tool' : 'Select from Tool Library'}
                </Button>
            </div>
             <button type="button" onClick={() => removeOperation(setup.id, op.id)} className="absolute top-2 right-2 text-text-muted hover:text-red-500">
                <CloseIcon />
            </button>
        </div>
    );
};
