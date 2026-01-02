
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Setup } from '../types';
import { PartVisualizer } from '../components/PartVisualizer';

interface ExtractedParameter {
    id: string;
    feature: string;
    dimension: string;
    tolerance: string;
    type: 'Critical' | 'Major' | 'Minor';
}

// Extended Setup type for visualization properties
interface SetupWithVisuals extends Setup {
    visualColor: string;
    visualBounds: { x: number; y: number; width: number; height: number }; // 2D Bounds in %
    setupNumber: number;
    relatedDimension?: string;
    relatedTolerance?: string;
}

export const ProcessAnalyserPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progressStage, setProgressStage] = useState('');
    const [results, setResults] = useState<{
        extractedParams: ExtractedParameter[];
        proposedSetups: SetupWithVisuals[];
    } | null>(null);
    const [activeSetupId, setActiveSetupId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setResults(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const selectedFile = e.dataTransfer.files[0];
            setFile(selectedFile);
            setResults(null);
        }
    };

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [file]);

    const simulateAnalysis = () => {
        setIsAnalyzing(true);
        setResults(null);
        
        setProgressStage('Scanning Document (OCR)...');
        setTimeout(() => setProgressStage('Extracting Dimensions & GD&T...'), 1500);
        setTimeout(() => setProgressStage('Identifying Views (Top, Front, Iso)...'), 3000);
        setTimeout(() => setProgressStage('Calculating Setup Logic...'), 4500);

        setTimeout(() => {
            const mockParams: ExtractedParameter[] = [
                { id: 'p1', feature: 'Bore Diameter', dimension: 'Ø50.00 mm', tolerance: 'H7 (+0.025/0)', type: 'Critical' },
                { id: 'p2', feature: 'Overall Length', dimension: '120.00 mm', tolerance: '±0.1', type: 'Major' },
                { id: 'p3', feature: 'Flange Thickness', dimension: '15.00 mm', tolerance: '±0.05', type: 'Major' },
                { id: 'p4', feature: 'Threaded Holes', dimension: 'M10 x 1.5', tolerance: '6H', type: 'Minor' },
            ];

            const mockSetups: SetupWithVisuals[] = [
                {
                    // Fix: Added explicit id and properties defined in Setup interface to satisfy SetupWithVisuals type
                    id: 's1',
                    name: 'Setup 1 - Top View Features',
                    timePerSetupMin: 30,
                    toolChangeTimeSec: 15,
                    efficiency: 0.9,
                    machineType: 'CNC Mill',
                    description: 'Face Milling & Drilling based on Top View',
                    visualColor: '#3b82f6',
                    visualBounds: { x: 20, y: 15, width: 30, height: 30 },
                    setupNumber: 1,
                    relatedDimension: '120mm',
                    relatedTolerance: '±0.1',
                    operations: [
                        { id: 'op1', processName: 'Face Milling', parameters: { machiningLength: 120, machiningWidth: 100, totalDepth: 2 }, toolName: 'Face Mill 63mm' },
                        { id: 'op3', processName: 'Drilling', parameters: { holeDepth: 20, numberOfHoles: 4 }, toolName: 'Drill 8.5mm' },
                    ]
                },
                {
                    id: 's2',
                    name: 'Setup 2 - Bore Finishing',
                    timePerSetupMin: 20,
                    toolChangeTimeSec: 15,
                    efficiency: 0.9,
                    machineType: 'CNC Mill',
                    description: 'Critical Bore H7 Tolerance',
                    visualColor: '#10b981',
                    visualBounds: { x: 55, y: 20, width: 25, height: 25 },
                    setupNumber: 2,
                    relatedDimension: 'Ø50mm',
                    relatedTolerance: 'H7',
                    operations: [
                        { id: 'op4', processName: 'Boring', parameters: { boreDepth: 50, allowance: 0.5 }, toolName: 'Boring Head 50mm' },
                    ]
                }
            ];

            setResults({ extractedParams: mockParams, proposedSetups: mockSetups });
            setIsAnalyzing(false);
        }, 6000);
    };

    return (
        <div className="w-full mx-auto space-y-8 animate-fade-in p-4 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center mb-2 flex-shrink-0">
                <div>
                    <h2 className="text-3xl font-bold text-primary">Drawing Scanner & Process Planner</h2>
                    <p className="text-text-secondary mt-1">Scan drawings (PDF/Img) to extract dimensions and generate setup-based process plans.</p>
                </div>
            </div>

            {!results && !isAnalyzing ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Card className="w-full max-w-2xl">
                        <div 
                            className="border-2 border-dashed border-border rounded-lg p-16 text-center cursor-pointer hover:border-primary transition-colors bg-background/30"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                onChange={handleFileChange} 
                                accept="image/png,image/jpeg,image/jpg,application/pdf,image/tiff,image/tif"
                            />
                            {file ? (
                                <div className="flex flex-col items-center">
                                    {file.type === 'application/pdf' ? (
                                        <div className="mb-4 h-48 w-48 rounded-lg border border-border shadow-lg bg-gray-800 flex items-center justify-center">
                                            <div className="text-center">
                                                <svg className="w-16 h-16 mx-auto text-red-500 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5v1.5H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>
                                                <span className="text-white font-medium">PDF</span>
                                            </div>
                                        </div>
                                    ) : previewUrl && file.type.startsWith('image/') && !file.type.includes('tiff') ? (
                                        <div className="mb-4 h-48 w-full max-w-md overflow-hidden rounded-lg border border-border shadow-lg bg-black">
                                            <img src={previewUrl} alt="Preview" className="h-full w-full object-contain opacity-90" />
                                        </div>
                                    ) : (
                                        <div className="mb-4 h-48 w-48 rounded-lg border border-border shadow-lg bg-gray-800 flex items-center justify-center">
                                            <div className="text-center">
                                                <svg className="w-16 h-16 mx-auto text-blue-500 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                                                <span className="text-white font-medium">{file.name.split('.').pop()?.toUpperCase()}</span>
                                            </div>
                                        </div>
                                    )}
                                    <p className="font-medium text-text-primary text-lg">{file.name}</p>
                                    <p className="text-sm text-text-secondary">{(file.size / 1024).toFixed(2)} KB</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-text-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-text-primary font-medium text-lg">Upload Engineering Drawing</p>
                                    <p className="text-text-secondary mt-2">Supports JPG, PNG, PDF, TIFF</p>
                                </div>
                            )}
                        </div>
                        
                        {file && (
                            <Button 
                                className="w-full mt-6 py-3 text-lg" 
                                onClick={simulateAnalysis} 
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Scan & Analyze Drawing
                            </Button>
                        )}
                    </Card>
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                    <div className="flex flex-col h-full min-h-[400px]">
                        <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="w-2 h-6 bg-primary rounded mr-2"></span>
                                Annotated Drawing
                            </div>
                            <span className="text-xs font-normal text-text-secondary bg-surface px-2 py-1 rounded border border-border">
                                OCR Engine
                            </span>
                        </h3>
                        <Card className="flex-1 !p-0 overflow-hidden border-2 border-border/50 bg-black relative">
                            <PartVisualizer 
                                imageUrl={previewUrl}
                                fileType={file?.type}
                                isScanning={isAnalyzing}
                                setups={results ? results.proposedSetups.map(s => ({
                                    id: s.id,
                                    bounds: s.visualBounds,
                                    color: s.visualColor,
                                    number: s.setupNumber,
                                    description: s.name,
                                    dimensions: s.relatedDimension,
                                    tolerance: s.relatedTolerance
                                })) : []}
                                activeSetupId={activeSetupId}
                                onSetupSelect={setActiveSetupId}
                            />
                        </Card>
                        
                        {!isAnalyzing && results && (
                            <div className="mt-4 bg-surface border border-border rounded-lg p-4">
                                <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    Recognized Features & Dimensions
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {results.extractedParams.map(param => (
                                        <div key={param.id} className="bg-background/50 p-2 rounded text-xs border border-border flex justify-between items-center">
                                            <div>
                                                <span className="block text-text-secondary">{param.feature}</span>
                                                <span className="font-mono text-text-primary font-bold">{param.dimension}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`block font-mono ${param.type === 'Critical' ? 'text-red-400 font-bold' : 'text-text-muted'}`}>
                                                    {param.tolerance}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col h-full min-h-0 overflow-hidden">
                        {isAnalyzing ? (
                            <Card className="h-full flex flex-col items-center justify-center text-center p-12">
                                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                                <h3 className="text-xl font-bold text-primary mb-2">{progressStage}</h3>
                                <p className="text-text-secondary">Analyzing geometry vectors and reading GD&T symbols...</p>
                            </Card>
                        ) : (
                            <>
                                <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center">
                                    <span className="w-2 h-6 bg-secondary-accent rounded mr-2"></span>
                                    Recommended Process Plan
                                </h3>
                                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                                    {results?.proposedSetups.map((setup) => (
                                        <div 
                                            key={setup.id} 
                                            className={`
                                                border rounded-xl transition-all duration-300 overflow-hidden cursor-pointer
                                                ${activeSetupId === setup.id 
                                                    ? 'border-l-8 border-t border-r border-b border-l-[color:var(--highlight-color)] bg-background scale-[1.01] shadow-lg' 
                                                    : 'border-border bg-surface hover:border-l-4 hover:border-l-[color:var(--highlight-color)] hover:bg-background/60'}
                                            `}
                                            style={{ '--highlight-color': setup.visualColor } as any}
                                            onClick={() => setActiveSetupId(setup.id)}
                                        >
                                            <div className="p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                                                            style={{ backgroundColor: setup.visualColor }}
                                                        >
                                                            {setup.setupNumber}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-text-primary text-lg">{setup.name}</h4>
                                                            <span className="text-xs text-text-muted uppercase tracking-wider">{setup.machineType}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-mono bg-background/50 px-2 py-1 rounded text-text-secondary block">
                                                            ~{setup.timePerSetupMin} min
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2 pl-11">
                                                    {setup.operations.map((op, idx) => (
                                                        <div key={op.id} className="text-sm border-l-2 border-border pl-3 py-1 hover:bg-background/40 rounded-r">
                                                            <div className="flex justify-between">
                                                                <span className="text-text-primary font-medium">{idx + 1}. {op.processName}</span>
                                                                <span className="text-text-muted text-xs italic">{op.toolName}</span>
                                                            </div>
                                                            <div className="text-xs text-text-secondary mt-0.5">
                                                                {Object.entries(op.parameters).map(([k, v]) => `${k}: ${v}`).join(', ').substring(0, 50)}...
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <Button className="w-full py-4 text-lg mt-4 shadow-glow-primary">
                                        Export to Estimation Calculator
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
