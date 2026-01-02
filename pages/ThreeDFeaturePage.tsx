
import React, { useState, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, Html, TorusKnot } from '@react-three/drei';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';

ChartJS.register(ArcElement, Tooltip, Legend);

// --- 3D Components ---

const RotatingModel = ({ showBoundingBox, isTransparent }: { showBoundingBox: boolean; isTransparent: boolean }) => {
  const ref = useRef<any>(null);
  useFrame(() => {
    if (ref.current) {
        // ref.current.rotation.y += 0.002; // Auto rotate slightly
    }
  });

  return (
    // @ts-ignore
    <group ref={ref}>
        <TorusKnot args={[1, 0.3, 128, 16]} position={[0, 0, 0]}>
            {/* @ts-ignore */}
            <meshStandardMaterial 
                color="#4ade80" 
                roughness={0.2} 
                metalness={0.8} 
                transparent={isTransparent} 
                opacity={isTransparent ? 0.3 : 1} 
                wireframe={false}
            />
        </TorusKnot>
        {showBoundingBox && (
            // @ts-ignore
            <mesh>
                {/* @ts-ignore */}
                <boxGeometry args={[3, 3, 1.5]} />
                {/* @ts-ignore */}
                <meshBasicMaterial color="yellow" wireframe />
            {/* @ts-ignore */}
            </mesh>
        )}
    {/* @ts-ignore */}
    </group>
  );
};

const ModelViewer = ({ 
    showBoundingBox, 
    isTransparent,
    setContextMenu 
}: { 
    showBoundingBox: boolean;
    isTransparent: boolean;
    setContextMenu: (val: {x: number, y: number, visible: boolean}) => void;
}) => {
  return (
    <Canvas 
        shadows 
        camera={{ position: [0, 0, 5], fov: 50 }} 
        onContextMenu={(e) => {
            e.preventDefault();
            // Simple logic to position menu relative to canvas container
            // In a real app, use clientX/Y from event
            // Note: Canvas events wrap native events
            setContextMenu({ x: 100, y: 100, visible: true }); // Mock position for simplicity in this demo
        }}
    >
      <Suspense fallback={<Html center>Loading...</Html>}>
        <Stage environment="city" intensity={0.6}>
          <RotatingModel showBoundingBox={showBoundingBox} isTransparent={isTransparent} />
        </Stage>
      </Suspense>
      <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  );
};

// --- Mock Data ---

const MOCK_VIEWS = [
    { name: 'Top', icon: 'M4 6h16M4 12h16M4 18h16' }, // Simple lines
    { name: 'Right', icon: 'M12 4v16m8-8H4' },
    { name: 'Front', icon: 'M3 3h18v18H3z' },
    { name: 'Left', icon: 'M12 4v16m8-8H4' },
    { name: 'Back', icon: 'M3 3h18v18H3z' },
    { name: 'Bottom', icon: 'M4 6h16M4 12h16M4 18h16' },
    { name: 'ISO', icon: 'M12 3l9 5-9 5-9-5z M12 13l9-5v10l-9 5-9-5V8z' },
];

const MOCK_TABLE_DATA = [
    { index: '4-2-0', object: 'Outer section-3', machining: 'Rough straight turning', machine: 'CNC turning machine [small]', tool: 'Longitudinal turning', param1: '4713.30 s', param2: '2128.80 mm', param3: '63.00 m/min', param4: '151.00 1/min', param5: '0.18 mm/U' },
    { index: '4-2-0', object: 'Outer section-3', machining: 'Finish straight turning', machine: 'CNC turning machine [small]', tool: 'Longitudinal turning', param1: '182.30 s', param2: '88.70 mm', param3: '98.00 m/min', param4: '366.00 1/min', param5: '0.08 mm/U' },
];

export const ThreeDFeaturePage = () => {
    const [step, setStep] = useState(2); // Mock step 2 active
    const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, visible: false });
    const [showBoundingBox, setShowBoundingBox] = useState(true);
    const [isTransparent, setIsTransparent] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    
    // Form States
    const [complexity, setComplexity] = useState(50);
    const [quantity, setQuantity] = useState(50);
    const [precision, setPrecision] = useState(50);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
        }
    };

    const doughnutData1 = {
        labels: ['Setup costs', 'TSC', 'Saw', 'Additions'],
        datasets: [{
            data: [72.35, 67.14, 2.75, 2.46],
            backgroundColor: ['#4ade80', '#10b981', '#15803d', '#86efac'],
            borderWidth: 0,
        }]
    };

    const doughnutData2 = {
        labels: ['Unit costs', 'TSC', 'Material', 'Additions', 'Saw'],
        datasets: [{
            data: [221.40, 187.39, 21.33, 10.31, 2.28],
            backgroundColor: ['#fb923c', '#f97316', '#c2410c', '#fdba74', '#ea580c'],
            borderWidth: 0,
        }]
    };

    const chartOptions = {
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
        },
        cutout: '70%',
        maintainAspectRatio: false
    };

    return (
        <div className="w-full mx-auto space-y-6 animate-fade-in relative" onClick={() => setContextMenu({...contextMenu, visible: false})}>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
                accept=".glb,.gltf,.obj,.step,.stp"
            />
            {/* Stepper */}
            <div className="w-full py-4 border-b border-border mb-4">
                <div className="flex justify-between items-center max-w-4xl mx-auto px-4 relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -z-10"></div>
                    {[
                        { id: 1, label: 'CHOOSE MODEL' },
                        { id: 2, label: 'ADJUST TECHNOLOGY DATA' },
                        { id: 3, label: 'CALCULATION RESULT' }
                    ].map((s) => (
                        <div key={s.id} className="flex flex-col items-center bg-background px-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 mb-2 ${step === s.id ? 'border-primary text-primary bg-surface' : 'border-text-muted text-text-muted bg-surface'}`}>
                                {s.id}
                            </div>
                            <span className={`text-xs font-semibold ${step === s.id ? 'text-primary' : 'text-text-muted'}`}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
                {/* 3D Preview Column */}
                <div className="lg:col-span-7 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            3D preview of the selected model
                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </h3>
                    </div>
                    <Card className="flex-grow relative !p-0 overflow-hidden bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 border border-border">
                        <ModelViewer showBoundingBox={showBoundingBox} isTransparent={isTransparent} setContextMenu={setContextMenu} />
                        
                        {/* Simulated Context Menu Overlay */}
                        {contextMenu.visible && (
                            <div 
                                className="absolute bg-surface border border-border shadow-2xl rounded-md py-1 w-56 z-50 text-sm"
                                style={{ top: '20%', left: '30%' }} // Mock position
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button className="w-full text-left px-4 py-2 hover:bg-background/50">Set center of rotation</button>
                                <button className="w-full text-left px-4 py-2 hover:bg-background/50">Restore center of rotation</button>
                                <div className="border-t border-border my-1"></div>
                                <div className="px-4 py-2 flex justify-between hover:bg-background/50 cursor-pointer"><span>View</span> <span>▸</span></div>
                                <div className="px-4 py-2 flex justify-between hover:bg-background/50 cursor-pointer"><span>Rectangle selection</span> <span>▸</span></div>
                                <div className="border-t border-border my-1"></div>
                                <button onClick={() => setIsTransparent(!isTransparent)} className="w-full text-left px-4 py-2 hover:bg-background/50 flex justify-between">
                                    <span>Transparent model</span> <span className="text-text-muted text-xs">G</span>
                                </button>
                                <button className="w-full text-left px-4 py-2 hover:bg-background/50 flex justify-between">
                                    <span>Ignore model colors</span> <span className="text-text-muted text-xs">H</span>
                                </button>
                                <button onClick={() => setShowBoundingBox(!showBoundingBox)} className="w-full text-left px-4 py-2 hover:bg-background/50 flex justify-between">
                                    <span>Show bounding box</span> <span className="text-text-muted text-xs">X</span>
                                </button>
                                <button className="w-full text-left px-4 py-2 hover:bg-background/50 flex justify-between">
                                    <span>Show contours</span> <span className="text-text-muted text-xs">C</span>
                                </button>
                            </div>
                        )}

                        <div className="absolute bottom-4 right-4">
                            <Button variant="secondary" className="bg-surface/80 backdrop-blur-sm shadow-lg text-xs">Show raw part</Button>
                        </div>
                    </Card>
                    <div className="mt-4 flex gap-4">
                        <Button className="bg-blue-200 hover:bg-blue-300 text-blue-800 border-none" onClick={() => fileInputRef.current?.click()}>Select new model ↺</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">Feedback 💬</Button>
                    </div>
                </div>

                {/* Control Panel Column */}
                <div className="lg:col-span-5 h-full overflow-y-auto pr-2">
                    <h3 className="text-xl font-bold text-text-primary mb-4">Please select</h3>
                    
                    <div className="space-y-4 bg-surface p-4 rounded-lg border border-border">
                        <div className="grid grid-cols-3 gap-2 items-center">
                            <label className="text-sm font-semibold text-text-secondary text-right">Model:</label>
                            <div className="col-span-2 text-sm font-medium text-text-primary bg-background/50 px-3 py-2 rounded border border-border truncate">
                                {file ? file.name : 'VN00-MB-M0002-A - COPY'}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-center">
                            <label className="text-sm font-semibold text-text-secondary text-right">Material group:</label>
                            <div className="col-span-2">
                                <Select label="" value="Steel (non-alloyed)" onChange={() => {}} className="text-sm">
                                    <option>Steel (non-alloyed)</option>
                                    <option>Aluminum</option>
                                    <option>Stainless Steel</option>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-center">
                            <label className="text-sm font-semibold text-text-secondary text-right">Finished product:</label>
                            <div className="col-span-2">
                                <Select label="" value="RD 180" onChange={() => {}} className="text-sm">
                                    <option>RD 180 EN10277-S355J2 1.0577 (€20.96)</option>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="col-span-3 text-right">
                            <p className="text-xs text-blue-500 hover:underline cursor-pointer">If you have the CAD-Model of the raw part geometry, you can upload it here.</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-center">
                            <label className="text-sm font-semibold text-text-secondary text-right">Surface treatment:</label>
                            <div className="col-span-2">
                                <Select label="" value="" onChange={() => {}} className="text-sm text-text-muted">
                                    <option value="">No surface treatment</option>
                                    <option>Anodizing</option>
                                    <option>Black Oxide</option>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 space-y-6 bg-surface p-6 rounded-lg border border-border">
                        {[
                            { label: 'Complexity', value: complexity, set: setComplexity },
                            { label: 'Batch Size', value: quantity, set: setQuantity },
                            { label: 'Parameters', value: precision, set: setPrecision },
                            { label: 'Total time', value: 40, set: () => {} },
                            { label: 'Programming times', value: 20, set: () => {} }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <label className="w-1/3 text-sm font-semibold text-text-secondary text-right flex items-center justify-end gap-1">
                                    {item.label}: <span className="text-text-muted cursor-help">ⓘ</span>
                                </label>
                                <div className="flex-1 flex flex-col">
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={item.value} 
                                        onChange={(e) => item.set(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[10px] text-text-muted mt-1 uppercase">
                                        <span>low</span>
                                        <span>medium</span>
                                        <span>high</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-4 text-center">
                        <button className="text-sm text-blue-500 hover:text-blue-600 font-medium">Further settings can be modified here »</button>
                        <p className="text-xs text-text-muted mt-1">(Hourly rates of machines, material groups, surface treatments, semi-finished products)</p>
                    </div>

                    <div className="mt-6 bg-blue-900 rounded-md p-1 relative overflow-hidden h-8">
                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 w-3/4"></div>
                        <div className="absolute top-0 right-0 h-full flex items-center px-2">
                            <button className="text-red-500 hover:text-red-400 font-bold">✖</button>
                        </div>
                    </div>
                    <p className="text-xs text-center text-text-secondary mt-1">Calculating manufacturing costs</p>
                </div>
            </div>

            {/* Results Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border pt-8">
                <div className="flex flex-col items-center">
                    <div className="w-48 h-48 relative">
                        <Doughnut data={doughnutData1} options={chartOptions} />
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                            <span className="text-xs text-text-secondary">Setup costs</span>
                            <span className="text-lg font-bold text-text-primary">€72.35</span>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-4 text-sm w-full max-w-xs justify-center flex-wrap">
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-700"></span> <span>SAW 4%</span></div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500"></span> <span>TSC 93%</span></div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-300"></span> <span>AC 3%</span></div>
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <div className="w-48 h-48 relative">
                        <Doughnut data={doughnutData2} options={chartOptions} />
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                            <span className="text-xs text-text-secondary">Unit costs</span>
                            <span className="text-lg font-bold text-text-primary">€221.40</span>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-4 text-sm w-full max-w-xs justify-center flex-wrap">
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-600"></span> <span>SAW 1%</span></div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500"></span> <span>TSC 85%</span></div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-400"></span> <span>MC 10%</span></div>
                    </div>
                </div>
            </div>

            {/* Reports Section */}
            <div className="space-y-4 border-t border-border pt-8">
                {[
                    { title: 'Detailed cost report', desc: 'This report shows a more detailed breakdown of the calculated manufacturing costs.' },
                    { title: 'Detailed process report', desc: 'This report shows the individual manufacturing operations and their associated manufacturing times.' },
                    { title: 'Detailed PCF report', desc: 'This report shows a more detailed breakdown of the calculated CO₂ emissions that occur during the manufacturing of this part.' }
                ].map((report, idx) => (
                    <div key={idx} className="flex justify-between items-center py-4 border-b border-border last:border-0">
                        <div>
                            <h4 className="text-lg font-bold text-text-primary">{report.title}</h4>
                            <p className="text-sm text-text-secondary mt-1">{report.desc}</p>
                        </div>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]">
                            {report.title} »
                        </Button>
                    </div>
                ))}
            </div>

            {/* Views & Table */}
            <div className="border-t border-border pt-8 bg-surface p-6 rounded-lg">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Views */}
                    <div className="w-full md:w-1/3 flex flex-col items-center">
                        <h4 className="font-bold text-text-primary mb-4">Views</h4>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div></div>
                            <div className="flex flex-col items-center"><svg className="w-8 h-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={MOCK_VIEWS[0].icon}/></svg><span className="text-[10px] uppercase">Top</span></div>
                            <div></div>
                            <div className="flex flex-col items-center"><svg className="w-8 h-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={MOCK_VIEWS[3].icon}/></svg><span className="text-[10px] uppercase">Left</span></div>
                            <div className="flex flex-col items-center"><svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d={MOCK_VIEWS[2].icon}/></svg><span className="text-[10px] uppercase">Front</span></div>
                            <div className="flex flex-col items-center"><svg className="w-8 h-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={MOCK_VIEWS[1].icon}/></svg><span className="text-[10px] uppercase">Right</span></div>
                            <div></div>
                            <div className="flex flex-col items-center"><svg className="w-8 h-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={MOCK_VIEWS[5].icon}/></svg><span className="text-[10px] uppercase">Bottom</span></div>
                            <div></div>
                        </div>
                    </div>

                    {/* ISO View */}
                    <div className="w-full md:w-1/3 flex flex-col items-center justify-center">
                        <h4 className="font-bold text-text-primary mb-4">ISO</h4>
                        <div className="w-48 h-48 bg-gray-200 rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden relative">
                             {/* Static placeholder for ISO view */}
                             <svg className="w-32 h-32 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d={MOCK_VIEWS[6].icon} />
                             </svg>
                        </div>
                    </div>

                    {/* General Info */}
                    <div className="w-full md:w-1/3 pl-4 border-l border-border">
                        <h4 className="font-bold text-text-primary mb-4">General information</h4>
                        <ul className="space-y-2 text-sm text-text-secondary">
                            <li>29 Processing objects</li>
                            <li>11 Tools</li>
                            <li>3 Machines ⓘ</li>
                        </ul>
                        <div className="mt-8 space-y-2">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700">Variant 1 ▼</Button>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700">Export process report »</Button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="mt-8">
                    <h4 className="font-bold text-text-primary mb-4 text-center uppercase bg-background py-2">View FRONT</h4>
                    <div className="flex gap-4">
                        <div className="w-1/4 bg-white border border-border p-2 flex items-center justify-center">
                             <div className="w-full h-32 bg-red-500/20 border-l-4 border-gray-400 relative">
                                <div className="absolute left-0 top-1/2 w-4 h-full bg-gray-400 -translate-x-full -translate-y-1/2"></div>
                                <div className="w-full h-full bg-red-600"></div>
                                <div className="absolute top-1/2 left-0 w-20 h-px bg-black"></div>
                                <span className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full text-xs bg-gray-200 px-1">4-2-0</span>
                             </div>
                        </div>
                        <div className="w-3/4 overflow-x-auto">
                            <table className="min-w-full text-xs border border-border">
                                <thead className="bg-background">
                                    <tr>
                                        <th className="border p-1">#</th>
                                        <th className="border p-1">Index</th>
                                        <th className="border p-1">Objects</th>
                                        <th className="border p-1">Machining</th>
                                        <th className="border p-1">Machine</th>
                                        <th className="border p-1">Tools</th>
                                        <th className="border p-1">Ø</th>
                                        <th className="border p-1">thu</th>
                                        <th className="border p-1">Vc</th>
                                        <th className="border p-1">RPM</th>
                                        <th className="border p-1">Feed/R</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-blue-600 text-white font-bold"><td colSpan={11} className="p-1">4-2-0 - Outer section-3</td></tr>
                                    {MOCK_TABLE_DATA.map((row, i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-surface' : 'bg-background'}>
                                            <td className="border p-1 text-center">{i+1}</td>
                                            <td className="border p-1">{row.index}</td>
                                            <td className="border p-1">{row.object}</td>
                                            <td className="border p-1">{row.machining}</td>
                                            <td className="border p-1">{row.machine}</td>
                                            <td className="border p-1">{row.tool}</td>
                                            <td className="border p-1"></td>
                                            <td className="border p-1">{row.param1}</td>
                                            <td className="border p-1">{row.param3}</td>
                                            <td className="border p-1">{row.param4}</td>
                                            <td className="border p-1">{row.param5}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
