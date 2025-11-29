
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { CloseIcon } from './ui/CloseIcon';
import type { Operation, Process, Tool, Machine, Setup, View } from '../types';
import { ToolSelectionModal } from './ToolSelectionModal';
import { StandardOperationForm } from './StandardOperationForm';
import { FaceMillingOperationForm } from './FaceMillingOperationForm';

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
    onNavigate: (view: View) => void;
}

export const OperationModal: React.FC<OperationModalProps> = ({
    isOpen, onClose, onSave, setup, operationToEdit,
    processes, tools, machines, isMetric, getDisplayValue, getMetricValue, formatCurrency, onNavigate
}) => {
    // State
    const [formData, setFormData] = useState<Partial<Operation>>({});
    const [isToolModalOpen, setIsToolModalOpen] = useState(false);
    const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
    const [maximizedImageUrl, setMaximizedImageUrl] = useState<string | null>(null);

    // Derived Data
    const machineForSetup = useMemo(() => machines.find(m => m.id === setup.machineId), [setup.machineId, machines]);
    const availableProcesses = useMemo(() => 
        machineForSetup ? processes.filter(p => p.compatibleMachineTypes.includes(machineForSetup.machineType)) : [], 
    [machineForSetup, processes]);

    const currentProcess = useMemo(() => 
        processes.find(p => p.name === formData.processName), 
    [formData.processName, processes]);

    // Initialization
    useEffect(() => {
        if (isOpen) {
            if (operationToEdit) {
                // If editing, load data and skip selection screen
                setFormData(operationToEdit);
                const proc = processes.find(p => p.name === operationToEdit.processName);
                if (proc) setSelectedProcessId(proc.id);
            } else {
                // New operation: Reset and show selection screen
                setFormData({});
                setSelectedProcessId(null);
            }
        }
    }, [isOpen, operationToEdit, processes]);

    const handleProcessSelect = (process: Process) => {
        // Initialize generic params with 0 or defaults to prevent NaN issues in calcs
        const initialParams: Record<string, number> = {};
        if (Array.isArray(process.parameters)) {
            process.parameters.forEach((p: any) => {
                 initialParams[p.name] = 0;
            });
            
            // Smart defaults for common params to improve UX
            if ('machiningLength' in initialParams) initialParams.machiningLength = 100;
            if ('machiningWidth' in initialParams) initialParams.machiningWidth = 50;
            if ('totalDepth' in initialParams) initialParams.totalDepth = 10;
            if ('depthPerPass' in initialParams) initialParams.depthPerPass = 1;
            if ('stepover' in initialParams) initialParams.stepover = 0.7;
        }

        setFormData({
            processName: process.name,
            parameters: initialParams,
        });
        setSelectedProcessId(process.id);
    };

    const handleToolSelect = (tool: Tool) => {
        const processDef = processes.find(p => p.name === formData.processName);
        const isTurning = processDef?.group === 'Turning';

        const newParameters = { ...formData.parameters };
        
        // Set defaults from tool
        newParameters.cuttingSpeed = tool.cuttingSpeedVc || 0;
        if (isTurning) {
            newParameters.feedPerRev = tool.feedPerTooth || 0; 
        } else {
            newParameters.feedPerTooth = tool.feedPerTooth || 0;
        }

        setFormData(prev => ({
            ...prev,
            toolId: tool.id,
            toolName: tool.name,
            parameters: newParameters,
            estimatedToolLifeHours: undefined, // Reset override
        }));
        setIsToolModalOpen(false);
    };

    const handleSave = () => {
        if (!formData.processName) return;
        const opId = operationToEdit?.id || uuid();
        const opToSave: Operation = {
            id: opId,
            processName: formData.processName,
            parameters: formData.parameters || {},
            toolId: formData.toolId,
            toolName: tools.find(t => t.id === formData.toolId)?.name,
            estimatedToolLifeHours: formData.estimatedToolLifeHours,
        };
        onSave(setup.id, opToSave);
    };

    const handleBackToSelection = () => {
        setSelectedProcessId(null);
        setFormData({});
    };

    if (!isOpen || !machineForSetup) return null;

    return (
        <>
            {maximizedImageUrl && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100] p-4 animate-fade-in"
                    onClick={() => setMaximizedImageUrl(null)}
                >
                    <div className="relative max-w-4xl w-full max-h-[90vh] bg-surface p-2 rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        <img 
                            src={maximizedImageUrl} 
                            alt="Process Illustration" 
                            className="w-full h-full object-contain rounded"
                        />
                         <button 
                            onClick={() => setMaximizedImageUrl(null)}
                            className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full p-2 shadow-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="Close image view"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                    </div>
                </div>
            )}
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
                {isToolModalOpen && (
                    <ToolSelectionModal
                        isOpen={isToolModalOpen}
                        onClose={() => setIsToolModalOpen(false)}
                        onSelect={handleToolSelect}
                        tools={tools}
                        machineType={machineForSetup.machineType}
                        onNavigate={onNavigate}
                    />
                )}
                
                <Card className="max-w-5xl w-full relative max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b border-border pb-4 flex-shrink-0">
                        <div className="flex items-center gap-4">
                             {selectedProcessId && !operationToEdit && (
                                <button onClick={handleBackToSelection} className="text-text-secondary hover:text-primary flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </button>
                            )}
                            <h2 className="text-2xl font-bold text-primary">
                                {selectedProcessId ? (operationToEdit ? 'Edit Operation' : `Add ${formData.processName}`) : 'Select Operation'}
                            </h2>
                        </div>
                        <button onClick={onClose} className="text-text-muted hover:text-text-primary">
                            <CloseIcon />
                        </button>
                    </div>

                    <div className="overflow-y-auto pr-2 flex-grow">
                        {!selectedProcessId ? (
                            /* Process Selection Grid */
                            <div>
                                <p className="text-text-secondary mb-4">Select a process for <span className="font-semibold text-text-primary">{machineForSetup.name}</span> ({machineForSetup.machineType})</p>
                                {availableProcesses.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {availableProcesses.map(process => (
                                            <button
                                                key={process.id}
                                                onClick={() => handleProcessSelect(process)}
                                                className="flex flex-col items-center p-4 bg-surface border border-border rounded-xl hover:border-primary hover:shadow-lg transition-all duration-200 group text-center h-full"
                                            >
                                                <div className="h-16 w-16 mb-3 flex items-center justify-center bg-background rounded-full group-hover:scale-110 transition-transform duration-200">
                                                    {process.imageUrl ? (
                                                        <img src={process.imageUrl} alt={process.name} className="h-10 w-10 object-contain opacity-80 group-hover:opacity-100" />
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-text-muted group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="font-medium text-text-primary group-hover:text-primary">{process.name}</span>
                                                <span className="text-xs text-text-muted mt-1">{process.group}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-text-muted bg-background/50 rounded-xl">
                                        No compatible processes found for this machine type. <br/>
                                        Please add processes to the Process Library.
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Operation Form */
                            currentProcess ? (
                                currentProcess.name === 'Face Milling' ? (
                                    <FaceMillingOperationForm
                                        formData={formData}
                                        setFormData={setFormData}
                                        isToolModalOpen={isToolModalOpen}
                                        setIsToolModalOpen={setIsToolModalOpen}
                                        tools={tools}
                                        isMetric={isMetric}
                                        process={currentProcess}
                                        onSetMaximizedImage={setMaximizedImageUrl}
                                    />
                                ) : (
                                    <StandardOperationForm 
                                        formData={formData}
                                        setFormData={setFormData}
                                        process={currentProcess}
                                        setup={setup}
                                        machine={machineForSetup}
                                        tools={tools}
                                        onToolClick={() => setIsToolModalOpen(true)}
                                        isMetric={isMetric}
                                        getDisplayValue={getDisplayValue}
                                        getMetricValue={getMetricValue}
                                        formatCurrency={formatCurrency}
                                        onSetMaximizedImage={setMaximizedImageUrl}
                                    />
                                )
                            ) : (
                                <p className="text-red-500">Error: Process definition not found.</p>
                            )
                        )}
                    </div>

                    {selectedProcessId && (
                        <div className="flex justify-end space-x-4 mt-4 pt-4 border-t border-border flex-shrink-0">
                            <Button variant="secondary" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleSave}>
                                {operationToEdit ? 'Save Changes' : 'Add Operation'}
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </>
    );
};
