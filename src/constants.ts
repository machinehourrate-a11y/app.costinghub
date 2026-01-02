import type { MaterialProperty, MaterialMasterItem, Machine, Process, Tool, Calculation, MachiningInput, RegionCurrencyMap, ChangelogEntry } from "./types";

// Helper to parse value and unit
const parsePropertyValue = (rawKey: string, rawValue: string | number | null): MaterialProperty | undefined => {
  if (rawValue === null || rawValue === "N/A" || rawValue === "") {
    return undefined;
  }

  let unit = '';
  let cleanKey = rawKey;

  const unitMatch = rawKey.match(/\(([^)]+)\)/);
  if (unitMatch && unitMatch[1]) {
    unit = unitMatch[1];
    cleanKey = rawKey.replace(/\s*\([^)]+\)/, '');
  }

  let value: number | string = rawValue;
  if (typeof rawValue === 'string') {
    const numValue = parseFloat(rawValue);
    if (!isNaN(numValue) && isFinite(numValue)) {
      value = numValue;
    }
  }
  
  // Specific conversions for consistency (e.g., to metric SI units where appropriate)
  if (cleanKey === 'Density' && unit === 'lb/in³' && typeof value === 'number') {
      value = parseFloat((value * 27.68).toFixed(4)); // 1 lb/in³ = 27.68 g/cm³
      unit = 'g/cm³';
  } else if (cleanKey === 'Max Service Temperature, Air' && unit === '°F' && typeof value === 'number') {
      value = parseFloat(((value - 32) * 5/9).toFixed(1)); // Convert to °C
      unit = '°C';
  } else if (unit === 'ksi' && typeof value === 'number') {
      value = parseFloat((value * 6.89476).toFixed(2)); // Convert ksi to MPa
      unit = 'MPa';
  } else if (unit === 'psi' && typeof value === 'number') {
      value = parseFloat((value * 0.00689476).toFixed(2)); // Convert psi to MPa
      unit = 'MPa';
  }

  return { value, unit };
};


const rawMaterialsData: any[] = [
    // P - Steel
    { id: 'mat_001', name: 'Steel 1018', category: 'P - Steel', subCategory: 'Non-alloyed steel 0.1-0.25% Carbon', properties: { 'Density (g/cm³)': 7.87, 'Cost Per Kg (USD)': 1.5, 'Tensile Strength, Ultimate (MPa)': 440, 'Modulus of Elasticity (GPa)': 205, 'Thermal Conductivity (W/m-K)': 51.9, 'Hardness, Rockwell R': 71 } },
    { id: 'mat_002', name: 'Steel 1045', category: 'P - Steel', subCategory: 'Non-alloyed steel 0.26-0.50% Carbon', properties: { 'Density (g/cm³)': 7.87, 'Cost Per Kg (USD)': 1.8, 'Tensile Strength, Ultimate (MPa)': 570, 'Modulus of Elasticity (GPa)': 200, 'Thermal Conductivity (W/m-K)': 51, 'Hardness, Rockwell R': 84 } },
    { id: 'mat_003', name: 'Steel 4140', category: 'P - Steel', subCategory: 'Low Alloyed Steel', properties: { 'Density (g/cm³)': 7.85, 'Cost Per Kg (USD)': 2.5, 'Tensile Strength, Ultimate (MPa)': 655, 'Modulus of Elasticity (GPa)': 190, 'Thermal Conductivity (W/m-K)': 42.6, 'Hardness, Rockwell R': 95 } },
    { id: 'mat_004', name: 'Tool Steel D2', category: 'P - Steel', subCategory: 'Tool Steel and High Alloy Steel', properties: { 'Density (g/cm³)': 7.7, 'Cost Per Kg (USD)': 8, 'Tensile Strength, Ultimate (MPa)': 2150, 'Modulus of Elasticity (GPa)': 210, 'Thermal Conductivity (W/m-K)': 20, 'Hardness, Rockwell C': 62 } },

    // M - Stainless Steel
    { id: 'mat_005', name: 'Stainless Steel 304', category: 'M - Stainless Steel', subCategory: 'Austenitic', properties: { 'Density (g/cm³)': 8.0, 'Cost Per Kg (USD)': 4.5, 'Tensile Strength, Ultimate (MPa)': 515, 'Modulus of Elasticity (GPa)': 193, 'Thermal Conductivity (W/m-K)': 16.2, 'Hardness, Rockwell R': 88 } },
    { id: 'mat_006', name: 'Stainless Steel 316', category: 'M - Stainless Steel', subCategory: 'Austenitic', properties: { 'Density (g/cm³)': 8.0, 'Cost Per Kg (USD)': 5.5, 'Tensile Strength, Ultimate (MPa)': 515, 'Modulus of Elasticity (GPa)': 193, 'Thermal Conductivity (W/m-K)': 16.3, 'Hardness, Rockwell R': 95 } },
    { id: 'mat_007', name: 'Stainless Steel 430', category: 'M - Stainless Steel', subCategory: 'Ferritic', properties: { 'Density (g/cm³)': 7.8, 'Cost Per Kg (USD)': 3.5, 'Tensile Strength, Ultimate (MPa)': 450, 'Modulus of Elasticity (GPa)': 200, 'Thermal Conductivity (W/m-K)': 26.1, 'Hardness, Rockwell R': 85 } },
    { id: 'mat_008', name: 'Stainless Steel 17-4 PH', category: 'M - Stainless Steel', subCategory: 'Precipitation Hardening', properties: { 'Density (g/cm³)': 7.8, 'Cost Per Kg (USD)': 12, 'Tensile Strength, Ultimate (MPa)': 1310, 'Modulus of Elasticity (GPa)': 200, 'Thermal Conductivity (W/m-K)': 17.9, 'Hardness, Rockwell C': 44 } },

    // K - Cast Iron
    { id: 'mat_009', name: 'Grey Cast Iron (Class 30)', category: 'K - Cast Iron', subCategory: 'Grey Cast Iron', properties: { 'Density (g/cm³)': 7.15, 'Cost Per Kg (USD)': 1.2, 'Tensile Strength, Ultimate (MPa)': 207, 'Modulus of Elasticity (GPa)': 96, 'Thermal Conductivity (W/m-K)': 53.3, 'Hardness, Brinell': 187 } },
    { id: 'mat_010', name: 'Ductile Iron 65-45-12', category: 'K - Cast Iron', subCategory: 'Ductile Cast Iron', properties: { 'Density (g/cm³)': 7.1, 'Cost Per Kg (USD)': 1.8, 'Tensile Strength, Ultimate (MPa)': 448, 'Modulus of Elasticity (GPa)': 169, 'Thermal Conductivity (W/m-K)': 36, 'Hardness, Brinell': 170 } },

    // N - Non-ferrous
    { id: 'mat_011', name: 'Aluminum 6061-T6', category: 'N - Non-ferrous', subCategory: 'Aluminum', properties: { 'Density (g/cm³)': 2.7, 'Cost Per Kg (USD)': 4, 'Tensile Strength, Ultimate (MPa)': 310, 'Modulus of Elasticity (GPa)': 68.9, 'Thermal Conductivity (W/m-K)': 167, 'Hardness, Rockwell R': 60 } },
    { id: 'mat_012', name: 'Aluminum 7075-T6', category: 'N - Non-ferrous', subCategory: 'Aluminum', properties: { 'Density (g/cm³)': 2.81, 'Cost Per Kg (USD)': 7, 'Tensile Strength, Ultimate (MPa)': 572, 'Modulus of Elasticity (GPa)': 71.7, 'Thermal Conductivity (W/m-K)': 130, 'Hardness, Rockwell R': 87 } },
    { id: 'mat_013', name: 'Brass 360', category: 'N - Non-ferrous', subCategory: 'Copper Alloy', properties: { 'Density (g/cm³)': 8.5, 'Cost Per Kg (USD)': 9, 'Tensile Strength, Ultimate (MPa)': 360, 'Modulus of Elasticity (GPa)': 97, 'Thermal Conductivity (W/m-K)': 115, 'Hardness, Rockwell R': 78 } },

    // S - Superalloys & Titanium
    { id: 'mat_014', name: 'Titanium Ti-6Al-4V (Grade 5)', category: 'S - Superalloys & Titanium', subCategory: 'Titanium', properties: { 'Density (g/cm³)': 4.43, 'Cost Per Kg (USD)': 45, 'Tensile Strength, Ultimate (MPa)': 950, 'Modulus of Elasticity (GPa)': 113.8, 'Thermal Conductivity (W/m-K)': 6.7, 'Hardness, Rockwell C': 36 } },
    { id: 'mat_015', name: 'Inconel 718', category: 'S - Superalloys & Titanium', subCategory: 'High Temperature Super Alloy (HRSA)', properties: { 'Density (g/cm³)': 8.19, 'Cost Per Kg (USD)': 50, 'Tensile Strength, Ultimate (MPa)': 1375, 'Modulus of Elasticity (GPa)': 200, 'Thermal Conductivity (W/m-K)': 11.4, 'Hardness, Rockwell C': 42 } },

    // H - Hardened Steel
    { id: 'mat_016', name: 'Hardened Steel 4140 (HRC 45)', category: 'H - Hardened Steel', subCategory: 'Hardened Steel', properties: { 'Density (g/cm³)': 7.85, 'Cost Per Kg (USD)': 3.5, 'Tensile Strength, Ultimate (MPa)': 1500, 'Modulus of Elasticity (GPa)': 205, 'Thermal Conductivity (W/m-K)': 42, 'Hardness, Rockwell C': 45 } },

    // O - Polymers
    { id: 'mat_017', name: 'Delrin (Acetal)', category: 'O - Polymers', subCategory: 'Thermoplastic', properties: { 'Density (g/cm³)': 1.41, 'Cost Per Kg (USD)': 10, 'Tensile Strength, Ultimate (MPa)': 65, 'Modulus of Elasticity (GPa)': 2.8, 'Thermal Conductivity (W/m-K)': 0.23, 'Hardness, Rockwell R': 120 } },
    { id: 'mat_018', name: 'PEEK', category: 'O - Polymers', subCategory: 'High-Performance Thermoplastic', properties: { 'Density (g/cm³)': 1.32, 'Cost Per Kg (USD)': 100, 'Tensile Strength, Ultimate (MPa)': 95, 'Modulus of Elasticity (GPa)': 3.6, 'Thermal Conductivity (W/m-K)': 0.25, 'Hardness, Rockwell R': 126 } },
];


export const INITIAL_MATERIALS_MASTER: MaterialMasterItem[] = rawMaterialsData
  .filter(material => {
    const density = material.properties['Density (g/cm³)'];
    const cost = material.properties['Cost Per Kg (USD)'];
    const isValid = (value: any) => value !== null && value !== "N/A" && value !== "" && parseFloat(value) > 0;
    return isValid(density) && isValid(cost);
  })
  .map(material => {
  const newProperties: { [key: string]: MaterialProperty } = {};
  for (const [key, value] of Object.entries(material.properties)) {
    const parsed = parsePropertyValue(key, value as string | number | null);
    if (parsed) {
      const cleanKey = key.replace(/\s*\([^)]+\)/, '');
      newProperties[cleanKey] = parsed;
    }
  }
  return {
    id: material.id,
    name: material.name,
    category: material.category as MaterialMasterItem['category'],
    subCategory: (material as any).subCategory,
    properties: newProperties
  };
}) as any;

export const DEFAULT_MATERIAL_NAMES = new Set(INITIAL_MATERIALS_MASTER.map(m => m.name));

export const DEFAULT_MACHINES_MASTER: Machine[] = [
    { id: 'mach_001', name: 'HAAS VF-2', brand: 'HAAS', model: 'VF-2', hourlyRate: 75, machineType: 'CNC Mill', xAxis: 762, yAxis: 406, zAxis: 508, powerKw: 22.4, additionalAxis: '4th' },
    { id: 'mach_002', name: 'Doosan Puma 2600Y', brand: 'Doosan', model: 'Puma 2600Y', hourlyRate: 90, machineType: 'CNC Lathe', xAxis: 260, yAxis: 105, zAxis: 830, powerKw: 22, additionalAxis: 'Y-Axis' },
    { id: 'mach_003', name: 'Amada HFA-250W', brand: 'Amada', model: 'HFA-250W', hourlyRate: 40, machineType: 'Saw', xAxis: 250, yAxis: 250, zAxis: 0, powerKw: 4, additionalAxis: 'None' },
    { id: 'mach_004', name: 'Okuma M560-V', brand: 'Okuma', model: 'M560-V', hourlyRate: 85, machineType: 'CNC Mill', xAxis: 1050, yAxis: 560, zAxis: 460, powerKw: 15, additionalAxis: '5th' },
    { id: 'mach_005', name: 'Mazak Integrex i-200', brand: 'Mazak', model: 'Integrex i-200', hourlyRate: 150, machineType: 'CNC Lathe', xAxis: 450, yAxis: 250, zAxis: 1585, powerKw: 22, additionalAxis: 'Y-Axis' },
    { id: 'mach_006', name: 'DMG Mori DMU 50', brand: 'DMG Mori', model: 'DMU 50', hourlyRate: 120, machineType: 'CNC Mill', xAxis: 650, yAxis: 520, zAxis: 475, powerKw: 13, additionalAxis: '5th' },
    { id: 'mach_007', name: 'Fanuc Robodrill D21LiB5', brand: 'Fanuc', model: 'Robodrill D21LiB5', hourlyRate: 70, machineType: 'CNC Mill', xAxis: 700, yAxis: 400, zAxis: 330, powerKw: 10, additionalAxis: 'None' },
    { id: 'mach_008', name: 'Okamoto ACC-8.20DX', brand: 'Okamoto', model: 'ACC-8.20DX', hourlyRate: 65, machineType: 'Grinder', xAxis: 500, yAxis: 200, zAxis: 300, powerKw: 5, additionalAxis: 'None' },
    { id: 'mach_009', name: 'Gleason Genesis 200GX', brand: 'Gleason', model: '200GX', hourlyRate: 130, machineType: 'Gear Cutter', xAxis: 210, yAxis: 240, zAxis: 300, powerKw: 20, additionalAxis: 'None' },
] as any;

export const DEFAULT_MACHINE_NAMES = new Set(DEFAULT_MACHINES_MASTER.map(m => m.name));

export const MACHINE_TYPES = ['CNC Mill', 'CNC Lathe', 'Grinder', 'Saw', 'Gear Cutter'];
export const ADDITIONAL_AXIS_OPTIONS = ['None', '4th', '5th', 'Y-Axis'];

export const DEFAULT_PROCESSES: Process[] = [
    { id: 'proc_cncmill_001', name: 'Face Milling', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], imageUrl: 'https://i.ibb.co/L5B703Q/face-milling.png',
        parameters: [
            { name: 'machiningLength', label: 'Machining Length (L)', unit: 'mm' },
            { name: 'machiningWidth', label: 'Machining Width (W)', unit: 'mm' },
            { name: 'totalDepth', label: 'Total Depth (TD)', unit: 'mm' },
            { name: 'depthPerPass', label: 'Depth of Cut per Pass (ap)', unit: 'mm' },
            { name: 'stepover', label: 'Stepover', unit: 'fraction' },
        ],
        formula: `(function() {
            if (!toolDiameter || toolDiameter <= 0 || !cuttingSpeedVc || cuttingSpeedVc <= 0 || !feedPerTooth || feedPerTooth <= 0 || !numberOfTeeth || numberOfTeeth <= 0 || totalDepth <= 0 || depthPerPass <= 0 || machiningLength <= 0 || machiningWidth <= 0 || stepover <= 0) {
                return 0;
            }
            const spindleSpeed = (1000 * cuttingSpeedVc) / (Math.PI * toolDiameter);
            const feedPerRevolution = numberOfTeeth * feedPerTooth;
            const feedRate = spindleSpeed * feedPerRevolution;
            if (feedRate <= 0) { return 0; }
            const depthPassCount = Math.ceil(totalDepth / depthPerPass);
            const stepoverWidth = stepover * toolDiameter;
            const widthPassCount = machiningWidth <= toolDiameter ? 1 : Math.ceil((machiningWidth - toolDiameter) / stepoverWidth) + 1;
            const totalLinearPasses = depthPassCount * widthPassCount;
            const timePerPass = machiningLength / feedRate;
            const cuttingTime = totalLinearPasses * timePerPass;
            return cuttingTime;
        })()`
    },
    { id: 'proc_cncmill_002', name: 'Peripheral Milling', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], imageUrl: 'https://i.ibb.co/C1dC2F9/peripheral-milling.png', parameters: [
        { name: 'edgeLength', label: 'Edge Length', unit: 'mm' },
        { name: 'totalDepth', label: 'Total Depth (t)', unit: 'mm' },
        { name: 'depthPerPass', label: 'Depth per Pass (ap)', unit: 'mm' },
    ], formula: '((edgeLength + toolDiameter) * Math.ceil(totalDepth / (depthPerPass || 1))) / feedRate' },
    { id: 'proc_cncmill_003', name: 'Slot Milling', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], imageUrl: 'https://i.ibb.co/yY1h29J/slot-milling.png', parameters: [
        { name: 'slotLength', label: 'Slot Length', unit: 'mm' },
        { name: 'slotDepth', label: 'Slot Depth (t)', unit: 'mm' },
        { name: 'depthPerPass', label: 'Depth per Pass (ap)', unit: 'mm' },
    ], formula: '((slotLength + toolDiameter) * Math.ceil(slotDepth / (depthPerPass || 1))) / feedRate' },
    { id: 'proc_cncmill_004', name: 'Pocketing (MRR)', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], imageUrl: 'https://i.ibb.co/TqY2s1y/pocketing.png', parameters: [
        { name: 'pocketLength', label: 'Pocket Length', unit: 'mm' },
        { name: 'pocketWidth', label: 'Pocket Width', unit: 'mm' },
        { name: 'pocketDepth', label: 'Pocket Depth', unit: 'mm' },
        { name: 'radialEngagement', label: 'Radial Engagement (ae)', unit: 'mm' },
        { name: 'axialEngagement', label: 'Axial Engagement (ap)', unit: 'mm' },
    ], formula: '(axialEngagement > 0 && radialEngagement > 0 && feedRate > 0 ? (pocketLength * pocketWidth * pocketDepth) / (axialEngagement * radialEngagement * feedRate) : 0)' },
    { id: 'proc_cncmill_005', name: 'Profiling / Contouring', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], imageUrl: 'https://i.ibb.co/mHswkP5/contouring.png', parameters: [
        { name: 'perimeter', label: 'Perimeter (P)', unit: 'mm' },
        { name: 'totalDepth', label: 'Total Depth (t)', unit: 'mm' },
        { name: 'depthPerPass', label: 'Depth per Pass (ap)', unit: 'mm' },
    ], formula: '((perimeter + toolDiameter) * Math.ceil(totalDepth / (depthPerPass || 1))) / feedRate' },
    { id: 'proc_saw_001', name: 'Band Saw Cut-Off', group: 'Sawing', compatibleMachineTypes: ['Saw'], imageUrl: 'https://i.ibb.co/YyN1M0X/band-saw.png', parameters: [
        { name: 'cutWidth', label: 'Cut Width/Diameter', unit: 'mm' },
        { name: 'bladeTPI', label: 'Blade TPI', unit: 'TPI' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
    ], formula: '(cutWidth + allowance) / feedRate' },
];
export const DEFAULT_PROCESS_NAMES = new Set(DEFAULT_PROCESSES.map(p => p.name));

export const TOOL_TYPES = ['End Mill', 'Face Mill', 'Drill', 'Tap', 'Turning Insert', 'Boring Bar', 'Grooving Tool', 'Threading Tool', 'Parting Tool', 'Grinding Wheel', 'Hob Cutter', 'Shaper Cutter', 'Gear Form Cutter', 'Broach', 'Band Saw Blade', 'Circular Saw Blade'];
export const TOOL_MATERIALS = ['HSS', 'Cobalt', 'Carbide', 'PCD', 'CBN'];
export const ARBOR_OR_INSERT_OPTIONS: Tool['arborOrInsert'][] = ['Shank', 'Arbor', 'Insert'];

export const DEFAULT_TOOLS_MASTER: Tool[] = [
    { id: 'tool_001', name: 'Sandvik CoroMill Plura 10mm End Mill', brand: 'Sandvik', model: '2P342-1000-PA', toolType: 'End Mill', material: 'Carbide', diameter: 10, cornerRadius: 0.5, numberOfTeeth: 4, arborOrInsert: 'Shank', cuttingSpeedVc: 150, feedPerTooth: 0.06, compatibleMachineTypes: ['CNC Mill'], price: 95, estimatedLife: 50, speedRpm: null, feedRate: null },
    { id: 'tool_004', name: 'Iscar HELIQUMILL 50mm Face Mill', brand: 'Iscar', model: 'HM90 F90A D50-5-22', toolType: 'Face Mill', material: 'Carbide', diameter: 50, cornerRadius: null, numberOfTeeth: 5, arborOrInsert: 'Arbor', cuttingSpeedVc: 200, feedPerTooth: 0.12, compatibleMachineTypes: ['CNC Mill'], price: 280, estimatedLife: 100, speedRpm: null, feedRate: null },
    { id: 'tool_011', name: 'Amada SGLB 10 TPI Bandsaw Blade', brand: 'Amada', model: 'SGLB', toolType: 'Band Saw Blade', material: 'HSS', diameter: 27, cornerRadius: null, numberOfTeeth: 10, arborOrInsert: 'Shank', cuttingSpeedVc: 60, feedPerTooth: 0.05, compatibleMachineTypes: ['Saw'], price: 120, estimatedLife: 80, speedRpm: null, feedRate: null },
];
export const DEFAULT_TOOL_NAMES = new Set(DEFAULT_TOOLS_MASTER.map(t => t.name));

export const RAW_MATERIAL_PROCESSES = ['Billet', 'Casting', 'Forging', '3D Printing', 'Other'];

export const BILLET_SHAPES = [
  { name: 'Block', parameters: [{name: 'length', label: 'Length'}, {name: 'width', label: 'Width'}, {name: 'height', label: 'Height'}] },
  { name: 'Cylinder', parameters: [{name: 'diameter', label: 'Diameter'}, {name: 'height', label: 'Length/Height'}] },
  { name: 'Tube', parameters: [{name: 'outerDiameter', label: 'Outer Dia.'}, {name: 'innerDiameter', label: 'Inner Dia.'}, {name: 'height', label: 'Length/Height'}] },
  { name: 'Rectangle Tube', parameters: [{name: 'outerWidth', label: 'Outer Width'}, {name: 'outerHeight', label: 'Outer Height'}, {name: 'length', label: 'Length'}, {name: 'wallThickness', label: 'Wall Thickness'}] },
  { name: 'Plate', parameters: [{name: 'length', label: 'Length'}, {name: 'width', label: 'Width'}, {name: 'height', label: 'Thickness'}] },
  { name: 'Bar', parameters: [{name: 'length', label: 'Length'}, {name: 'width', label: 'Width'}, {name: 'height', label: 'Height'}] },
  { name: 'Rod', parameters: [{name: 'diameter', label: 'Diameter'}, {name: 'height', label: 'Length'}] },
  { name: 'Cube', parameters: [{name: 'side', label: 'Side Length'}] },
];

export const DEFAULT_COUNTRY_CURRENCY_MAP: RegionCurrencyMap[] = [
    { id: 'rcm_in', region: 'India', currency: 'INR' },
    { id: 'rcm_us', region: 'USA', currency: 'USD' },
    { id: 'rcm_de', region: 'Germany', currency: 'EUR' },
    { id: 'rcm_gb', region: 'United Kingdom', currency: 'GBP' },
    { id: 'rcm_ca', region: 'Canada', currency: 'CAD' },
    { id: 'rcm_au', region: 'Australia', currency: 'AUD' },
    { id: 'rcm_jp', region: 'Japan', currency: 'JPY' },
    { id: 'rcm_cn', region: 'China', currency: 'CNY' },
] as any;

export const SUPER_ADMIN_EMAILS = ['designersworldcbe@gmail.com', 'admin@costinghub.com', 'machinehourrate@gmail.com', 'gokulprasadrs20@gmail.com'];

export const INITIAL_INPUT: MachiningInput = {
  id: '',
  original_id: '',
  calculationNumber: '',
  partNumber: '',
  partName: '',
  customerName: '',
  revision: 'A',
  annualVolume: 1000,
  batchVolume: 100,
  createdAt: new Date().toISOString(),
  partImage: '',
  unitSystem: 'Metric',
  country: 'USA',
  currency: 'USD',
  materialCategory: '',
  materialType: '',
  materialCostPerKg: 0,
  materialDensityGcm3: 0,
  rawMaterialProcess: 'Billet',
  billetShape: 'Block',
  billetShapeParameters: { length: 100, width: 100, height: 50 },
  rawMaterialWeightKg: 0,
  finishedPartWeightKg: 0,
  partSurfaceAreaM2: 0,
  transportCostPerKg: 0,
  heatTreatmentCostPerKg: 0,
  surfaceTreatments: [],
  setups: [],
  markups: {
    general: 8,
    admin: 5,
    sales: 2,
    miscellaneous: 1,
    packing: 5,
    transport: 5,
    profit: 20,
    duty: 0,
  },
};

export const DEFAULT_CALCULATIONS_SHOWCASE: Calculation[] = [
  {
    id: 'calc_master_mill_v1',
    inputs: {
      id: 'inputs_master_mill', calculationNumber: 'TPL-MILL-01', partNumber: 'HSG-01', partName: 'CNC Mill Showcase', customerName: 'Showcase Customer', revision: 'A',
      createdAt: new Date().toISOString(), annualVolume: 5000, batchVolume: 200, unitSystem: 'Metric', country: 'USA', currency: 'USD',
      materialCategory: 'N - Non-ferrous', materialType: 'mat_011',
      rawMaterialProcess: 'Billet', billetShape: 'Block', billetShapeParameters: { length: 120, width: 80, height: 40 },
      rawMaterialWeightKg: 1.04, finishedPartWeightKg: 0.75, partSurfaceAreaM2: 0.05, materialCostPerKg: 4, materialDensityGcm3: 2.7, transportCostPerKg: 0.3, heatTreatmentCostPerKg: 0,
      surfaceTreatments: [{ id: 'st1', name: 'Anodizing', cost: 2, unit: 'per_kg', based_on: 'finished_weight' }], 
      markups: { general: 5, admin: 8, sales: 7, miscellaneous: 2, packing: 3, transport: 5, profit: 20, duty: 0 },
      setups: [{
        id: 'setup_mill_1', name: 'Milling Operations', machineId: 'mach_001', timePerSetupMin: 45, toolChangeTimeSec: 10, efficiency: 0.95,
        operations: [
          { id: 'op_m1', processName: 'Peripheral Milling', toolId: 'tool_001', parameters: { edgeLength: 120, totalDepth: 10, depthPerPass: 5 } },
          { id: 'op_m2', processName: 'Pocketing (MRR)', toolId: 'tool_001', parameters: { pocketLength: 50, pocketWidth: 30, pocketDepth: 15, radialEngagement: 5, axialEngagement: 10 } },
        ]
      }]
    },
    status: 'final', user_id: 'system-default', created_at: '2025-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_CALCULATION_IDS = new Set(DEFAULT_CALCULATIONS_SHOWCASE.map(c => c.id));

export const COUNTRY_CURRENCY_MAPPING = [
  { country: 'India', currency: 'INR' }, { country: 'United States', currency: 'USD' }, { country: 'United Kingdom', currency: 'GBP' },
  { country: 'Eurozone', currency: 'EUR' }, { country: 'Germany', currency: 'EUR' }, { country: 'France', currency: 'EUR' }, { country: 'Italy', currency: 'EUR' },
  { country: 'China', currency: 'CNY' }, { country: 'Japan', currency: 'JPY' }, { country: 'Canada', currency: 'CAD' }, { country: 'Australia', currency: 'AUD' },
  { country: 'Brazil', currency: 'BRL' }, { country: 'Russia', currency: 'RUB' }, { country: 'South Africa', currency: 'ZAR' }, { country: 'Switzerland', currency: 'CHF' },
];

export const ALL_COSTING_COUNTRIES = [...new Set(COUNTRY_CURRENCY_MAPPING.map(c => c.country))].sort();
export const ALL_CURRENCIES = [...new Set(COUNTRY_CURRENCY_MAPPING.map(c => c.currency))].sort();

export const COUNTRIES = [
    { name: 'India', code: 'IN', dial_code: '+91' },
    { name: 'United States', code: 'US', dial_code: '+1' },
    { name: 'United Kingdom', code: 'GB', dial_code: '+44' },
    { name: 'Germany', code: 'DE', dial_code: '+49' },
].sort((a, b) => a.name.localeCompare(b.name));

export const CURRENCY_CONVERSION_RATES_TO_USD: { [key: string]: number } = {
  USD: 1, EUR: 1.07, GBP: 1.27, INR: 0.012, CAD: 0.73, AUD: 0.66, JPY: 0.0064, CNY: 0.14
};

export const CHANGELOG_DATA: ChangelogEntry[] = [
    {
        version: "1.0.0",
        date: "2025-07-15",
        title: "Initial Launch of CostingHub",
        changes: [
            { type: "new", description: "Launch of the Machining Cost Calculator with core functionalities." },
        ]
    }
];
