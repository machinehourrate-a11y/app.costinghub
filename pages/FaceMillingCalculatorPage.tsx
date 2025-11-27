import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DisplayField } from '../components/ui/DisplayField';
import type { Tool } from '../types';

interface FaceMillingCalculatorPageProps {
    theme: 'light' | 'dark';
    tools: Tool[];
}

interface FaceMillingInputs {
    machiningLength: number;
    machiningWidth: number;
    totalDepth: number;
    depthPerPass: number;
    stepover: number;
    selectedToolId: string | null;
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


export const FaceMillingCalculatorPage: React.FC<FaceMillingCalculatorPageProps> = ({ theme, tools = [] }) => {
    const faceMills = useMemo(() => tools.filter(t => t.toolType === 'Face Mill'), [tools]);

    const [inputs, setInputs] = useState<FaceMillingInputs>({
        machiningLength: 100,
        machiningWidth: 50,
        totalDepth: 10,
        depthPerPass: 1,
        stepover: 0.7,
        selectedToolId: faceMills.length > 0 ? faceMills[0].id : null,
    });
    
    const selectedTool = useMemo(() => {
        if (!inputs.selectedToolId) return null;
        return tools.find(t => t.id === inputs.selectedToolId);
    }, [inputs.selectedToolId, tools]);
    
    const [outputs, setOutputs] = useState<FaceMillingOutputs | null>(null);

    useEffect(() => {
        const {
            machiningLength: L,
            machiningWidth: W,
            totalDepth: TD,
            depthPerPass: ap,
            stepover,
        } = inputs;

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
            spindleSpeed,
            feedPerRevolution,
            feedRate,
            depthPassCount,
            stepoverWidth,
            widthPassCount,
            totalLinearPasses,
            timePerPass,
            cuttingTime,
            mrr,
            toolLifeMinutes,
            toolLifeHours,
            partsPerTool,
        });

    }, [inputs, selectedTool]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
         if (name === 'selectedToolId') {
            setInputs(prev => ({ ...prev, [name]: value || null }));
        } else {
            setInputs(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inputs Column */}
                <div className="space-y-6">
                    <Card>
                        <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Job Inputs</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="Machining Length (L)" name="machiningLength" type="number" step="any" unit="mm" min="0" value={inputs.machiningLength} onChange={handleInputChange} />
                            <Input label="Machining Width (W)" name="machiningWidth" type="number" step="any" unit="mm" min="0" value={inputs.machiningWidth} onChange={handleInputChange} />
                            <Input label="Total Depth (TD)" name="totalDepth" type="number" step="any" unit="mm" min="0" value={inputs.totalDepth} onChange={handleInputChange} />
                            <Input label="Depth of Cut per Pass (ap)" name="depthPerPass" type="number" step="any" unit="mm" min="0" value={inputs.depthPerPass} onChange={handleInputChange} />
                            <Input label="Stepover" name="stepover" type="number" step="any" unit="(fraction)" min="0" max="1" value={inputs.stepover} onChange={handleInputChange} placeholder="e.g. 0.7" />
                        </div>
                    </Card>
                    <Card>
                         <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Tool Selection & Parameters</h2>
                        <div className="space-y-4">
                            <Select label="Select Face Mill" name="selectedToolId" value={inputs.selectedToolId || ''} onChange={handleInputChange}>
                                <option value="">Select a tool...</option>
                                {faceMills.map(tool => (
                                    <option key={tool.id} value={tool.id}>{tool.name}</option>
                                ))}
                            </Select>

                            {selectedTool ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                                    <DisplayField label="Cutter Diameter (D)" value={`${selectedTool.diameter} mm`} />
                                    <DisplayField label="Cutting Speed (V)" value={`${selectedTool.cuttingSpeedVc} m/min`} />
                                    <DisplayField label="Feed per Tooth (fz)" value={`${selectedTool.feedPerTooth} mm/tooth`} />
                                    <DisplayField label="Number of Teeth (z)" value={`${selectedTool.numberOfTeeth}`} />
                                    <DisplayField label="Designed Tool Life" value={`${selectedTool.estimatedLife} hr`} />
                                </div>
                            ) : (
                                <p className="text-center text-text-muted py-4">Please select a tool from your library.</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Outputs Column */}
                <div>
                     <Card>
                        <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Results</h2>
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
                                {faceMills.length === 0 && <p className="mt-2 text-yellow-500">No "Face Mill" tools found in your library. Please add one to use this calculator.</p>}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};
