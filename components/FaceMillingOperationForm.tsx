import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { DisplayField } from './ui/DisplayField';
import type { Tool, Operation, Process } from '../types';
import { Button } from './ui/Button';

interface FaceMillingOperationFormProps {
    formData: Partial<Operation>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Operation>>>;
    isToolModalOpen: boolean;
    setIsToolModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    tools: Tool[];
    isMetric: boolean; 
    process: Process;
    onSetMaximizedImage: (url: string) => void;
}

interface FaceMillingOutputs {
    spindleSpeed: number;
    feedPerRevolution: number;
    feedRate: number;
    depthPassCount: number;
    stepoverWidth: number;
    widthPassCount: number;
    totalLinearPasses: number;
    timePerPass: number;
    cuttingTime: number;
    mrr: number;
    toolLifeMinutes: number;
    toolLifeHours: number;
    partsPerTool: number;
}

const formatNumber = (value: number, digits: number = 2) => {
    if (isNaN(value) || !isFinite(value)) {
        return '0.00';
    }
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
};


export const FaceMillingOperationForm: React.FC<FaceMillingOperationFormProps> = ({
    formData, setFormData, setIsToolModalOpen, tools = [], process, onSetMaximizedImage
}) => {
    const faceMills = useMemo(() => tools.filter(t => t.toolType === 'Face Mill'), [tools]);

    const selectedTool = useMemo(() => {
        if (!formData.toolId) return null;
        return tools.find(t => t.id === formData.toolId);
    }, [formData.toolId, tools]);
    
    const [outputs, setOutputs] = useState<FaceMillingOutputs | null>(null);

    // Default parameters if they don't exist
    const machiningLength = formData.parameters?.machiningLength || 100;
    const machiningWidth = formData.parameters?.machiningWidth || 50;
    const totalDepth = formData.parameters?.totalDepth || 10;
    const depthPerPass = formData.parameters?.depthPerPass || 1;
    const stepover = formData.parameters?.stepover || 0.7;

    useEffect(() => {
        if (!selectedTool) {
            setOutputs(null);
            return;
        }

        const {
            diameter: D,
            cuttingSpeedVc: V,
            feedPerTooth: fz,
            numberOfTeeth: z,
            estimatedLife: toolLifeHoursFromLib,
        } = selectedTool;
        
        const L = machiningLength;
        const W = machiningWidth;
        const TD = totalDepth;
        const ap = depthPerPass;

        if (!D || D <= 0 || !V || V <= 0 || !fz || fz <= 0 || !z || z <= 0 || !toolLifeHoursFromLib || toolLifeHoursFromLib <= 0 || TD <= 0 || ap <= 0 || L <= 0 || W <= 0 || stepover <= 0) {
            setOutputs(null);
            return;
        }

        const spindleSpeed = (1000 * V) / (Math.PI * D);
        const feedPerRevolution = z * fz;
        const feedRate = spindleSpeed * feedPerRevolution;

        if (feedRate <= 0) {
            setOutputs(null);
            return;
        }

        const depthPassCount = Math.ceil(TD / ap);
        const stepoverWidth = stepover * D;
        const widthPassCount = W <= D ? 1 : Math.ceil((W - D) / stepoverWidth) + 1;
        
        const totalLinearPasses = depthPassCount * widthPassCount;
        const timePerPass = L / feedRate;
        const cuttingTime = totalLinearPasses * timePerPass;

        const mrr = stepoverWidth * ap * feedRate;
        
        const toolLifeHours = toolLifeHoursFromLib;
        const toolLifeMinutes = toolLifeHours * 60;
        const partsPerTool = cuttingTime > 0 ? Math.floor(toolLifeMinutes / cuttingTime) : 0;
        
        setOutputs({
            spindleSpeed, feedPerRevolution, feedRate, depthPassCount, stepoverWidth,
            widthPassCount, totalLinearPasses, timePerPass, cuttingTime, mrr,
            toolLifeMinutes, toolLifeHours, partsPerTool,
        });

    }, [formData.parameters, selectedTool, machiningLength, machiningWidth, totalDepth, depthPerPass, stepover]);

    const handleParamChange = (name: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            parameters: {
                ...prev.parameters,
                [name]: parseFloat(value) || 0
            }
        }));
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Inputs Column */}
            <div className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-text-primary">1. Job Inputs</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Machining Length (L)" name="machiningLength" type="number" step="any" unit="mm" min="0" value={machiningLength} onChange={e => handleParamChange('machiningLength', e.target.value)} />
                        <Input label="Machining Width (W)" name="machiningWidth" type="number" step="any" unit="mm" min="0" value={machiningWidth} onChange={e => handleParamChange('machiningWidth', e.target.value)} />
                        <Input label="Total Depth (TD)" name="totalDepth" type="number" step="any" unit="mm" min="0" value={totalDepth} onChange={e => handleParamChange('totalDepth', e.target.value)} />
                        <Input label="Depth of Cut per Pass (ap)" name="depthPerPass" type="number" step="any" unit="mm" min="0" value={depthPerPass} onChange={e => handleParamChange('depthPerPass', e.target.value)} />
                        <Input label="Stepover" name="stepover" type="number" step="any" unit="(fraction)" min="0" max="1" value={stepover} onChange={e => handleParamChange('stepover', e.target.value)} placeholder="e.g. 0.7" />
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold text-text-primary">2. Tool Selection</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <DisplayField label="Selected Tool" value={selectedTool?.name || 'N/A'} />
                        <Button type="button" onClick={() => setIsToolModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white self-end h-10">
                            {selectedTool ? 'Change Tool' : 'Select Tool'}
                        </Button>
                    </div>

                    {selectedTool && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-4 border-t border-border">
                            <DisplayField label="Cutter Diameter (D)" value={`${selectedTool.diameter} mm`} />
                            <DisplayField label="Cutting Speed (V)" value={`${selectedTool.cuttingSpeedVc} m/min`} />
                            <DisplayField label="Feed per Tooth (fz)" value={`${selectedTool.feedPerTooth} mm/tooth`} />
                            <DisplayField label="Number of Teeth (z)" value={`${selectedTool.numberOfTeeth}`} />
                            <DisplayField label="Designed Tool Life" value={`${selectedTool.estimatedLife} hr`} />
                        </div>
                    )}
                </div>
            </div>

            {/* Outputs Column */}
            <div className="space-y-6">
                {process.imageUrl && (
                    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                        <h3 className="text-lg font-semibold text-text-primary mb-2">Process Illustration</h3>
                        <div className="aspect-video bg-white rounded-lg border border-border flex items-center justify-center overflow-hidden">
                            <button 
                                type="button" 
                                onClick={() => onSetMaximizedImage(process.imageUrl!)} 
                                className="w-full h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                                title="Click to enlarge image"
                            >
                                <img src={process.imageUrl} alt={process.name} className="h-full w-full object-contain p-2"/>
                            </button>
                        </div>
                    </div>
                )}
                <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Results</h3>
                    {outputs && selectedTool ? (
                        <div className="space-y-6">
                            <div className="p-4 bg-green-600/10 border border-green-600/30 rounded-lg text-center">
                                <div className="text-lg font-semibold text-green-300">Total Cutting Time</div>
                                <div className="text-4xl font-bold text-green-400">{formatNumber(outputs.cuttingTime)} min</div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4">
                                    <DisplayField label="Material Removal Rate (MRR)" value={formatNumber(outputs.mrr, 0)} unit="mm³/min" />
                            </div>

                            <div className="border-t border-border pt-4">
                                <h3 className="font-semibold text-text-secondary mb-2">Tool Life</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                    <DisplayField label="Estimated Tool Life" value={`${formatNumber(outputs.toolLifeHours)} hr`} />
                                    <DisplayField label="Parts per Tool" value={formatNumber(outputs.partsPerTool, 0)} unit="parts" />
                                </div>
                            </div>

                            <div className="border-t border-border pt-4">
                                <h3 className="font-semibold text-text-secondary mb-2">Intermediate Calculations</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                    <DisplayField label="Spindle Speed" value={formatNumber(outputs.spindleSpeed, 0)} unit="RPM" />
                                    <DisplayField label="Feed Rate" value={formatNumber(outputs.feedRate, 0)} unit="mm/min" />
                                    <DisplayField label="Feed per Rev" value={formatNumber(outputs.feedPerRevolution, 3)} unit="mm/rev" />
                                    <DisplayField label="Width Passes" value={formatNumber(outputs.widthPassCount, 0)} />
                                    <DisplayField label="Depth Passes" value={formatNumber(outputs.depthPassCount, 0)} />
                                    <DisplayField label="Total Passes" value={formatNumber(outputs.totalLinearPasses, 0)} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-text-muted p-8">
                            <p>Enter valid inputs and select a tool to see results.</p>
                            {faceMills.length === 0 && <p className="mt-2 text-yellow-500">No "Face Mill" tools found in your library. Please add one to use this feature.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
