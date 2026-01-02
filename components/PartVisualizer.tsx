
import React from 'react';

interface FeatureBounds {
    x: number; // Percentage
    y: number; // Percentage
    width: number; // Percentage
    height: number; // Percentage
}

interface SetupVisual {
    id: string;
    bounds: FeatureBounds;
    color: string;
    number: number;
    description: string;
    dimensions?: string;
    tolerance?: string;
}

interface PartVisualizerProps {
    imageUrl: string | null;
    fileType?: string;
    setups: SetupVisual[];
    activeSetupId: string | null;
    onSetupSelect: (id: string) => void;
    isScanning?: boolean;
}

export const PartVisualizer: React.FC<PartVisualizerProps> = ({ 
    imageUrl, 
    fileType,
    setups, 
    activeSetupId, 
    onSetupSelect,
    isScanning = false 
}) => {
    
    // Determine how to render based on file type
    const isPdf = fileType === 'application/pdf';
    // const isImage = fileType?.startsWith('image/') && !fileType?.includes('tiff'); // Not used currently but logic is implicit in 'else'
    const isTiff = fileType === 'image/tiff' || fileType === 'image/tif';

    return (
        <div className="w-full h-full min-h-[500px] bg-gray-900 rounded-lg overflow-hidden relative shadow-inner flex items-center justify-center border border-border">
            {/* Header Overlay */}
            <div className="absolute top-4 left-4 z-20 bg-black/80 backdrop-blur-md p-3 rounded-lg border border-white/10 shadow-xl pointer-events-none">
                <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-1">
                    {isScanning ? 'OCR Scanning Active...' : 'Drawing Analysis Complete'}
                </h4>
                <p className="text-gray-400 text-[10px]">
                    {isScanning ? 'Extracting GD&T & Geometries' : 'Views Marked • Setups Assigned'}
                </p>
            </div>

            {/* The Image/Document Container */}
            <div className="relative w-full h-full flex items-center justify-center">
                {imageUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Rendering Logic */}
                        {isPdf ? (
                            <div className="w-full h-full bg-white relative group/pdf">
                                <object
                                    data={`${imageUrl}#toolbar=0&navpanes=0&view=Fit`}
                                    type="application/pdf"
                                    className="w-full h-full block"
                                >
                                    <div className="flex flex-col items-center justify-center h-full text-black p-4 text-center">
                                        <p className="mb-2">Unable to display PDF directly.</p>
                                        <a 
                                            href={imageUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors"
                                        >
                                            Open PDF in New Tab
                                        </a>
                                    </div>
                                </object>
                                {/* Overlay container for PDF */}
                                <div className="absolute inset-0 pointer-events-none z-10">
                                    {!isScanning && setups.map((setup) => (
                                        <div
                                            key={setup.id}
                                            onClick={() => onSetupSelect(setup.id)}
                                            className={`absolute border-2 transition-all duration-300 cursor-pointer pointer-events-auto group ${
                                                activeSetupId === setup.id 
                                                    ? 'bg-primary/20 border-primary z-30 shadow-[0_0_20px_rgba(139,92,246,0.5)]' 
                                                    : 'bg-transparent border-dashed border-primary/40 hover:bg-primary/10 hover:border-primary/80 z-20'
                                            }`}
                                            style={{
                                                left: `${setup.bounds.x}%`,
                                                top: `${setup.bounds.y}%`,
                                                width: `${setup.bounds.width}%`,
                                                height: `${setup.bounds.height}%`
                                            }}
                                        >
                                            <div 
                                                className={`absolute -top-3 -left-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md transition-transform duration-200 ${
                                                    activeSetupId === setup.id ? 'scale-125' : 'scale-100'
                                                }`}
                                                style={{ backgroundColor: setup.color }}
                                            >
                                                {setup.number}
                                            </div>
                                            {(setup.dimensions || setup.tolerance) && (
                                                <div className={`absolute left-0 -bottom-8 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40 ${activeSetupId === setup.id ? 'opacity-100' : ''}`}>
                                                    <span className="font-mono text-primary mr-2">{setup.dimensions}</span>
                                                    <span className="text-gray-300">{setup.tolerance}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : isTiff ? (
                            <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-800 rounded-lg max-w-md">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <h4 className="text-white font-bold mb-2">TIFF Preview Not Supported</h4>
                                <p className="text-gray-400 text-sm mb-4">This browser cannot display TIFF files natively.</p>
                                <div className="bg-black/30 p-3 rounded text-left w-full text-xs text-gray-300 font-mono">
                                    <p>Analysis Results:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        {setups.map(s => <li key={s.id}>Setup {s.number}: {s.description}</li>)}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="relative w-full h-full">
                                <img 
                                    src={imageUrl} 
                                    alt="Engineering Drawing" 
                                    className="w-full h-full object-contain select-none" 
                                />
                                {/* Image Overlay Logic */}
                                <div className="absolute inset-0">
                                    {!isScanning && setups.map((setup) => (
                                        <div
                                            key={setup.id}
                                            onClick={() => onSetupSelect(setup.id)}
                                            className={`absolute border-2 transition-all duration-300 cursor-pointer pointer-events-auto group ${
                                                activeSetupId === setup.id 
                                                    ? 'bg-primary/20 border-primary z-30 shadow-[0_0_20px_rgba(139,92,246,0.5)]' 
                                                    : 'bg-transparent border-dashed border-primary/40 hover:bg-primary/10 hover:border-primary/80 z-20'
                                            }`}
                                            style={{
                                                left: `${setup.bounds.x}%`,
                                                top: `${setup.bounds.y}%`,
                                                width: `${setup.bounds.width}%`,
                                                height: `${setup.bounds.height}%`
                                            }}
                                        >
                                            <div 
                                                className={`absolute -top-3 -left-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md transition-transform duration-200 ${
                                                    activeSetupId === setup.id ? 'scale-125' : 'scale-100'
                                                }`}
                                                style={{ backgroundColor: setup.color }}
                                            >
                                                {setup.number}
                                            </div>
                                            {(setup.dimensions || setup.tolerance) && (
                                                <div className={`absolute left-0 -bottom-8 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40 ${activeSetupId === setup.id ? 'opacity-100' : ''}`}>
                                                    <span className="font-mono text-primary mr-2">{setup.dimensions}</span>
                                                    <span className="text-gray-300">{setup.tolerance}</span>
                                                </div>
                                            )}
                                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-current text-primary"></div>
                                            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-current text-primary"></div>
                                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-current text-primary"></div>
                                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-current text-primary"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Scanning Laser Effect (Global Overlay) */}
                        {isScanning && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
                                <div className="w-full h-[2px] bg-primary shadow-[0_0_15px_rgba(139,92,246,0.8)] absolute top-0 animate-[scan_3s_linear_infinite]"></div>
                                <div className="absolute inset-0 bg-primary/5 animate-[pulse_2s_ease-in-out_infinite]"></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-gray-500 flex flex-col items-center">
                        <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span>No Drawing Loaded</span>
                    </div>
                )}
            </div>
            
            {/* Setup Legend */}
            {!isScanning && setups.length > 0 && (
                <div className="absolute bottom-4 left-4 z-20 flex flex-wrap gap-2 max-w-[80%] pointer-events-none">
                   {setups.map(s => (
                       <button 
                            key={s.id} 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all duration-200 backdrop-blur-sm pointer-events-auto ${activeSetupId === s.id ? 'bg-black/80 border-white/30 translate-y-[-2px] shadow-lg' : 'bg-black/40 border-transparent hover:bg-black/60 text-gray-300'}`}
                            onClick={() => onSetupSelect(s.id)}
                        >
                           <span className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ backgroundColor: s.color }}></span>
                           <span className={`text-xs ${activeSetupId === s.id ? 'text-white font-bold' : ''}`}>Setup {s.number}</span>
                       </button>
                   ))}
                </div>
            )}
            
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};
