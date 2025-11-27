import type { MaterialProperty, MaterialMasterItem, Machine, Process, SubscriptionPlan, Tool, Calculation, MachiningInput, MachiningResult, RegionCurrencyMap, ChangelogEntry } from "./types";

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
    // --- MILLING ---
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

            if (feedRate <= 0) {
                return 0;
            }

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
    { id: 'proc_cncmill_006', name: 'Chamfer Milling', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], imageUrl: 'https://i.ibb.co/FnyQCQd/chamfer-milling.png', parameters: [
        { name: 'edgeLength', label: 'Edge Length', unit: 'mm' },
    ], formula: '((edgeLength + toolDiameter) / feedRate)' },
    { id: 'proc_cncmill_007', name: 'Fillet/Radius Milling', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], imageUrl: 'https://i.ibb.co/QcYnL4V/radius-milling.png', parameters: [
        { name: 'arcLength', label: 'Total Arc Length', unit: 'mm' },
        { name: 'numberOfCorners', label: 'Number of Corners', unit: 'count' },
    ], formula: '((arcLength + (numberOfCorners * toolDiameter)) / feedRate)' },
    { id: 'proc_cncmill_010', name: 'Engraving', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], imageUrl: 'https://i.ibb.co/F8qGjPj/engraving.png', parameters: [
        { name: 'totalPathLength', label: 'Total Path Length', unit: 'mm' },
    ], formula: '(totalPathLength / feedRate)' },
    { id: 'proc_cncmill_013', name: '3D Surfacing (Scallop)', group: '3D Milling', compatibleMachineTypes: ['CNC Mill'], imageUrl: 'https://i.ibb.co/2N3S94c/3d-surfacing.png', parameters: [
        { name: 'surfaceArea', label: 'Surface Area to Finish', unit: 'mm²' },
        { name: 'stepover', label: 'Stepover (ae)', unit: 'mm' },
    ], formula: '((surfaceArea / (stepover || 1)) / feedRate)' },

    // --- HOLE MAKING (Mill & Lathe) ---
    { id: 'proc_hole_001', name: 'Helical Interpolation (Bore)', group: 'Hole Making', compatibleMachineTypes: ['CNC Mill'], imageUrl: 'https://i.ibb.co/q1rJ4j8/helical-interpolation.png', parameters: [
        { name: 'boreDepth', label: 'Bore Depth (t)', unit: 'mm' },
        { name: 'boreDiameter', label: 'Bore Diameter (D_path)', unit: 'mm' },
        { name: 'pitch', label: 'Pitch per Revolution (p/ap)', unit: 'mm' },
    ], formula: '(pitch > 0 ? (Math.ceil(boreDepth / pitch) * Math.sqrt(Math.pow(Math.PI * (boreDiameter - toolDiameter), 2) + Math.pow(pitch, 2))) / feedRate : 0)' },
    { id: 'proc_hole_002', name: 'Thread Milling', group: 'Hole Making', compatibleMachineTypes: ['CNC Mill'], imageUrl: 'https://i.ibb.co/Gv31c2d/thread-milling.png', parameters: [
        { name: 'threadDepth', label: 'Thread Depth', unit: 'mm' },
        { name: 'meanDiameter', label: 'Mean Thread Diameter', unit: 'mm' },
        { name: 'pitch', label: 'Thread Pitch', unit: 'mm' },
    ], formula: '(pitch > 0 ? (Math.PI * meanDiameter * (threadDepth / pitch)) / feedRate : 0)' },
    { id: 'proc_hole_003', name: 'Drilling (on Mill)', group: 'Hole Making', compatibleMachineTypes: ['CNC Mill'], imageUrl: 'https://i.ibb.co/yBN5M3W/drilling.png', parameters: [
        { name: 'holeDepth', label: 'Hole Depth', unit: 'mm' },
        { name: 'allowance', label: 'Allowance (for approach)', unit: 'mm' },
        { name: 'numberOfHoles', label: 'Number of Holes', unit: 'count' },
    ], formula: '(((holeDepth + allowance) / feedRate) * numberOfHoles)' },
    { id: 'proc_hole_004', name: 'Boring (Single Point)', group: 'Hole Making', compatibleMachineTypes: ['CNC Mill', 'CNC Lathe'], imageUrl: 'https://i.ibb.co/mXzS92V/boring.png', parameters: [
        { name: 'boreDepth', label: 'Bore Depth', unit: 'mm' },
        { name: 'feedPerRev', label: 'Feed per Revolution', unit: 'mm/rev' }
    ], formula: '(boreDepth / feedRate)' },

    // --- TURNING ---
    { id: 'proc_cnclathe_001', name: 'Turning (OD/ID)', group: 'Turning', compatibleMachineTypes: ['CNC Lathe'], imageUrl: 'https://i.ibb.co/XWpX7V6/turning-od-id.png', parameters: [
        { name: 'turningLength', label: 'Turning Length', unit: 'mm' },
        { name: 'diameterStart', label: 'Start Diameter', unit: 'mm' },
        { name: 'diameterEnd', label: 'End Diameter', unit: 'mm' },
        { name: 'depthPerPass', label: 'Depth per Pass (ap)', unit: 'mm' },
        { name: 'feedPerRev', label: 'Feed per Revolution', unit: 'mm/rev' },
    ], formula: '(depthPerPass > 0 ? (turningLength / feedRate) * Math.ceil(Math.abs(diameterStart - diameterEnd) / 2 / depthPerPass) : 0)' },
    { id: 'proc_cnclathe_002', name: 'Facing', group: 'Turning', compatibleMachineTypes: ['CNC Lathe'], imageUrl: 'https://i.ibb.co/mG7c3Rz/facing-lathe.png', parameters: [
        { name: 'facingDiameter', label: 'Facing Diameter', unit: 'mm' },
        { name: 'feedPerRev', label: 'Feed per Revolution', unit: 'mm/rev' },
    ], formula: '((facingDiameter / 2) / feedRate)' },
    { id: 'proc_cnclathe_003', name: 'Grooving', group: 'Turning', compatibleMachineTypes: ['CNC Lathe'], imageUrl: 'https://i.ibb.co/pwnLChM/grooving-lathe.png', parameters: [
        { name: 'grooveDepth', label: 'Groove Depth', unit: 'mm' },
        { name: 'feedPerRev', label: 'Feed per Revolution', unit: 'mm/rev' },
    ], formula: '(grooveDepth / feedRate)' },
    { id: 'proc_cnclathe_004', name: 'Parting Off', group: 'Turning', compatibleMachineTypes: ['CNC Lathe'], imageUrl: 'https://i.ibb.co/h1WqNqB/parting-off-lathe.png', parameters: [
        { name: 'partingDiameter', label: 'Parting Diameter', unit: 'mm' },
        { name: 'feedPerRev', label: 'Feed per Revolution', unit: 'mm/rev' },
    ], formula: '((partingDiameter / 2) / feedRate)' },
    { id: 'proc_cnclathe_005', name: 'Threading (on Lathe)', group: 'Turning', compatibleMachineTypes: ['CNC Lathe'], imageUrl: 'https://i.ibb.co/YPCw1HY/threading-lathe.png', parameters: [
        { name: 'threadLength', label: 'Thread Length', unit: 'mm' },
        { name: 'pitch', label: 'Thread Pitch', unit: 'mm' },
        { name: 'numberOfPasses', label: 'Number of Passes', unit: 'count' },
    ], formula: '((pitch * spindleSpeed) > 0 ? (threadLength / (pitch * spindleSpeed)) * numberOfPasses : 0)' },
    { id: 'proc_cnclathe_006', name: 'Drilling (on Lathe)', group: 'Turning', compatibleMachineTypes: ['CNC Lathe'], imageUrl: 'https://i.ibb.co/yBN5M3W/drilling.png', parameters: [
        { name: 'holeDepth', label: 'Hole Depth', unit: 'mm' },
        { name: 'allowance', label: 'Allowance (for approach)', unit: 'mm' },
        { name: 'numberOfHoles', label: 'Number of Holes', unit: 'count' },
    ], formula: '(((holeDepth + allowance) / feedRate) * numberOfHoles)' },
    
    // --- GRINDING ---
    { id: 'proc_grind_001', name: 'Surface Grinding (Reciprocating)', group: 'Grinding', compatibleMachineTypes: ['Grinder'], imageUrl: 'https://i.ibb.co/fHwBvD7/surface-grinding.png', parameters: [
        { name: 'lengthL', label: 'Length', unit: 'mm' },
        { name: 'widthW', label: 'Width', unit: 'mm' },
        { name: 'stockToRemoveSr', label: 'Stock to Remove', unit: 'mm' },
        { name: 'depthOfCutAp', label: 'Depth of Cut (ap)', unit: 'mm' },
        { name: 'tableSpeedVw', label: 'Table Speed (vw)', unit: 'mm/min' },
        { name: 'overlapRatioU', label: 'Overlap Ratio (U)', unit: '' },
        { name: 'sparkOutStrokesNso', label: 'Spark-out Strokes', unit: 'count' },
        { name: 'allowance', label: 'Over-travel Allowance', unit: 'mm' },
        { name: 'handlingTime', label: 'Handling Time', unit: 'min' },
        { name: 'dressingTime', label: 'Dressing Time', unit: 'min' },
        { name: 'partsBetweenDress', label: 'Parts Between Dress', unit: 'count' },
    ], formula: `(function() {
        const effectiveWheelWidth = toolDiameter || 1;
        const crossfeedStepFx = effectiveWheelWidth * (1 - overlapRatioU);
        const crossfeedPassesNx = Math.ceil((widthW - effectiveWheelWidth) / (crossfeedStepFx || 1)) + 1;
        const depthPassesNz = depthOfCutAp > 0 ? Math.ceil(stockToRemoveSr / depthOfCutAp) : 0;
        const timePerDoubleStrokeTds = (tableSpeedVw > 0 ? (lengthL + allowance) / tableSpeedVw : 0);
        const cuttingTime = depthPassesNz * crossfeedPassesNx * timePerDoubleStrokeTds;
        const sparkOutTime = sparkOutStrokesNso * timePerDoubleStrokeTds;
        const dressingTimePerPart = partsBetweenDress > 0 ? dressingTime / partsBetweenDress : 0;
        return cuttingTime + sparkOutTime + dressingTimePerPart + handlingTime;
    })()` },
    { id: 'proc_grind_002', name: 'Surface Grinding (Creep-Feed)', group: 'Grinding', compatibleMachineTypes: ['Grinder'], imageUrl: 'https://i.ibb.co/fHwBvD7/surface-grinding.png', parameters: [
        { name: 'lengthL', label: 'Length', unit: 'mm' },
        { name: 'depthOfCutAp', label: 'Depth of Cut (ap)', unit: 'mm' },
        { name: 'tableSpeedVw', label: 'Table Speed (vw)', unit: 'mm/min' },
        { name: 'allowance', label: 'Over-travel Allowance', unit: 'mm' },
        { name: 'sparkOutTime', label: 'Spark-out Time', unit: 'min' },
        { name: 'handlingTime', label: 'Handling Time', unit: 'min' },
        { name: 'dressingTime', label: 'Dressing Time', unit: 'min' },
        { name: 'partsBetweenDress', label: 'Parts Between Dress', unit: 'count' },
    ], formula: '(tableSpeedVw > 0 ? (lengthL + allowance) / tableSpeedVw : 0) + sparkOutTime + (partsBetweenDress > 0 ? dressingTime / partsBetweenDress : 0) + handlingTime' },
    { id: 'proc_grind_003', name: 'Cylindrical Grinding (Traverse)', group: 'Grinding', compatibleMachineTypes: ['Grinder', 'CNC Lathe'], imageUrl: 'https://i.ibb.co/N1j89t6/cylindrical-grinding.png', parameters: [
        { name: 'groundLengthL', label: 'Ground Length', unit: 'mm' },
        { name: 'stockToRemoveSr', label: 'Radial Stock to Remove', unit: 'mm' },
        { name: 'depthOfCutAp', label: 'Radial Depth of Cut (ap)', unit: 'mm' },
        { name: 'tableSpeedVw', label: 'Table Speed (vw)', unit: 'mm/min' },
        { name: 'overlapRatioU', label: 'Overlap Ratio (U)', unit: '' },
        { name: 'sparkOutStrokesNso', label: 'Spark-out Strokes', unit: 'count' },
        { name: 'allowance', label: 'Over-travel Allowance', unit: 'mm' },
        { name: 'handlingTime', label: 'Handling Time', unit: 'min' },
        { name: 'dressingTime', label: 'Dressing Time', unit: 'min' },
        { name: 'partsBetweenDress', label: 'Parts Between Dress', unit: 'count' },
    ], formula: `(function() {
        const effectiveWheelWidth = toolDiameter || 1;
        const crossfeedStepFx = effectiveWheelWidth * (1 - overlapRatioU);
        const axialPassesNx = Math.ceil((groundLengthL - effectiveWheelWidth) / (crossfeedStepFx || 1)) + 1;
        const depthPassesNz = depthOfCutAp > 0 ? Math.ceil(stockToRemoveSr / depthOfCutAp) : 0;
        const timePerDoubleStrokeTds = (tableSpeedVw > 0 ? (groundLengthL + allowance) / tableSpeedVw : 0);
        const cuttingTime = depthPassesNz * axialPassesNx * timePerDoubleStrokeTds;
        const sparkOutTime = sparkOutStrokesNso * timePerDoubleStrokeTds;
        const dressingTimePerPart = partsBetweenDress > 0 ? dressingTime / partsBetweenDress : 0;
        return cuttingTime + sparkOutTime + dressingTimePerPart + handlingTime;
    })()` },
    { id: 'proc_grind_004', name: 'Cylindrical Grinding (Plunge)', group: 'Grinding', compatibleMachineTypes: ['Grinder', 'CNC Lathe'], imageUrl: 'https://i.ibb.co/N1j89t6/cylindrical-grinding.png', parameters: [
        { name: 'stockToRemoveSr', label: 'Radial Stock to Remove', unit: 'mm' },
        { name: 'infeedRateRin', label: 'Infeed Rate (rin)', unit: 'mm/min' },
        { name: 'sparkOutTime', label: 'Spark-out/Dwell Time', unit: 'min' },
        { name: 'handlingTime', label: 'Handling Time', unit: 'min' },
        { name: 'dressingTime', label: 'Dressing Time', unit: 'min' },
        { name: 'partsBetweenDress', label: 'Parts Between Dress', unit: 'count' },
    ], formula: '(infeedRateRin > 0 ? stockToRemoveSr / infeedRateRin : 0) + sparkOutTime + (partsBetweenDress > 0 ? dressingTime / partsBetweenDress : 0) + handlingTime' },
    { id: 'proc_grind_005', name: 'Centerless Grinding (Through-Feed)', group: 'Grinding', compatibleMachineTypes: ['Grinder'], imageUrl: 'https://i.ibb.co/v4vVb5P/centerless-grinding.png', parameters: [
        { name: 'partLengthLp', label: 'Part Length', unit: 'mm' },
        { name: 'axialFeedSpeedVax', label: 'Axial Feed Speed (v_ax)', unit: 'mm/min' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
        { name: 'sparkOutTime', label: 'Spark-out Time', unit: 'min' },
        { name: 'handlingTime', label: 'Handling Time', unit: 'min' },
        { name: 'dressingTime', label: 'Dressing Time', unit: 'min' },
        { name: 'partsBetweenDress', label: 'Parts Between Dress', unit: 'count' },
    ], formula: '(axialFeedSpeedVax > 0 ? (partLengthLp + allowance) / axialFeedSpeedVax : 0) + sparkOutTime + (partsBetweenDress > 0 ? dressingTime / partsBetweenDress : 0) + handlingTime' },
     { id: 'proc_grind_006', name: 'Centerless Grinding (Infeed)', group: 'Grinding', compatibleMachineTypes: ['Grinder'], imageUrl: 'https://i.ibb.co/v4vVb5P/centerless-grinding.png', parameters: [
        { name: 'stockToRemoveSr', label: 'Radial Stock to Remove', unit: 'mm' },
        { name: 'infeedRateRin', label: 'Infeed Rate (rin)', unit: 'mm/min' },
        { name: 'sparkOutTime', label: 'Spark-out/Dwell Time', unit: 'min' },
        { name: 'handlingTime', label: 'Handling Time', unit: 'min' },
        { name: 'dressingTime', label: 'Dressing Time', unit: 'min' },
        { name: 'partsBetweenDress', label: 'Parts Between Dress', unit: 'count' },
    ], formula: '(infeedRateRin > 0 ? stockToRemoveSr / infeedRateRin : 0) + sparkOutTime + (partsBetweenDress > 0 ? dressingTime / partsBetweenDress : 0) + handlingTime' },
    { id: 'proc_grind_007', name: 'Thread Grinding', group: 'Grinding', compatibleMachineTypes: ['Grinder'], imageUrl: 'https://i.ibb.co/42pLg69/thread-grinding.png', parameters: [
        { name: 'threadLengthLt', label: 'Thread Length', unit: 'mm' },
        { name: 'pitchP', label: 'Pitch', unit: 'mm' },
        { name: 'numberOfPassesNp', label: 'Number of Passes', unit: 'count' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
        { name: 'sparkOutTime', label: 'Spark-out Time', unit: 'min' },
    ], formula: '((pitchP * spindleSpeed) > 0 ? (numberOfPassesNp * ((threadLengthLt + allowance) / (pitchP * spindleSpeed))) + sparkOutTime : 0)' },

    // --- GEAR CUTTING ---
    { id: 'proc_gear_001', name: 'Gear Hobbing', group: 'Gear Cutting', compatibleMachineTypes: ['Gear Cutter'], imageUrl: 'https://i.ibb.co/bFqYyFv/gear-hobbing.png', parameters: [
        { name: 'faceWidthB', label: 'Face Width', unit: 'mm' },
        { name: 'feedPerRevFa', label: 'Feed per Rev (fa)', unit: 'mm/rev' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
        { name: 'numberOfPasses', label: 'Number of Passes', unit: 'count' },
    ], formula: '((feedPerRevFa * spindleSpeed) > 0 ? (numberOfPasses * (faceWidthB + allowance)) / (feedPerRevFa * spindleSpeed) : 0)' },
    { id: 'proc_gear_002', name: 'Gear Shaping', group: 'Gear Cutting', compatibleMachineTypes: ['Gear Cutter'], imageUrl: 'https://i.ibb.co/MfZT556/gear-shaping.png', parameters: [
        { name: 'faceWidthB', label: 'Face Width', unit: 'mm' },
        { name: 'feedPerStrokeFs', label: 'Feed per Stroke (fs)', unit: 'mm/stroke' },
        { name: 'strokesPerMinuteNs', label: 'Strokes per Minute', unit: 'strokes/min' },
        { name: 'numberOfPasses', label: 'Number of Passes', unit: 'count' },
    ], formula: '((feedPerStrokeFs * strokesPerMinuteNs) > 0 ? (numberOfPasses * faceWidthB) / (feedPerStrokeFs * strokesPerMinuteNs) : 0)' },
    { id: 'proc_gear_003', name: 'Gear Milling (Form Cutter)', group: 'Gear Cutting', compatibleMachineTypes: ['CNC Mill'], imageUrl: 'https://i.ibb.co/yQd69P7/gear-milling.png', parameters: [
        { name: 'numberOfTeethZ', label: 'Number of Teeth (z)', unit: 'count' },
        { name: 'totalToothDepthH', label: 'Total Tooth Depth (h)', unit: 'mm' },
        { name: 'feedPerRevFn', label: 'Feed per Rev (fn)', unit: 'mm/rev' },
        { name: 'numberOfPasses', label: 'Passes per Tooth', unit: 'count' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
        { name: 'indexingTimePerTooth', label: 'Indexing Time per Tooth', unit: 'min' },
    ], formula: '((feedPerRevFn * spindleSpeed) > 0 ? (numberOfTeethZ * numberOfPasses * ((totalToothDepthH + allowance) / (feedPerRevFn * spindleSpeed))) + (numberOfTeethZ * indexingTimePerTooth) : (numberOfTeethZ * indexingTimePerTooth))' },
    { id: 'proc_gear_004', name: 'Internal Gear Broaching', group: 'Gear Cutting', compatibleMachineTypes: ['Gear Cutter'], imageUrl: 'https://i.ibb.co/h9tQW25/broaching.png', parameters: [
        { name: 'strokeLengthS', label: 'Stroke Length', unit: 'mm' },
        { name: 'strokeSpeedVs', label: 'Stroke Speed (vs)', unit: 'mm/min' },
        { name: 'returnSpeedVr', label: 'Return Speed (vr)', unit: 'mm/min' },
    ], formula: '(strokeSpeedVs > 0 ? strokeLengthS / strokeSpeedVs : 0) + (returnSpeedVr > 0 ? strokeLengthS / returnSpeedVr : 0)' },
    { id: 'proc_gear_005', name: 'Gear Grinding (Form)', group: 'Gear Cutting', compatibleMachineTypes: ['Grinder', 'Gear Cutter'], imageUrl: 'https://i.ibb.co/JqKx3vM/gear-grinding.png', parameters: [
        { name: 'totalToothDepthH', label: 'Total Stock to Remove', unit: 'mm' },
        { name: 'radialInfeedRateRin', label: 'Radial Infeed Rate', unit: 'mm/min' },
        { name: 'numberOfPasses', label: 'Number of Passes', unit: 'count' },
        { name: 'sparkOutTime', label: 'Spark-out Time', unit: 'min' },
    ], formula: '(radialInfeedRateRin > 0 ? (totalToothDepthH / radialInfeedRateRin) * numberOfPasses : 0) + sparkOutTime' },
    { id: 'proc_gear_006', name: 'Gear Shaving (Finishing)', group: 'Gear Cutting', compatibleMachineTypes: ['Gear Cutter'], imageUrl: 'https://i.ibb.co/qmg9x0X/gear-shaving.png', parameters: [
        { name: 'faceWidthB', label: 'Face Width', unit: 'mm' },
        { name: 'axialFeedFa', label: 'Axial Feed per Rev (fa)', unit: 'mm/rev' },
        { name: 'numberOfStrokesNs', label: 'Number of Strokes', unit: 'count' },
    ], formula: '((axialFeedFa * spindleSpeed) > 0 ? ((faceWidthB / (axialFeedFa * spindleSpeed)) * numberOfStrokesNs) : 0)' },

    // --- SAWING ---
    { id: 'proc_saw_001', name: 'Band Saw Cut-Off', group: 'Sawing', compatibleMachineTypes: ['Saw'], imageUrl: 'https://i.ibb.co/YyN1M0X/band-saw.png', parameters: [
        { name: 'cutWidth', label: 'Cut Width/Diameter', unit: 'mm' },
        { name: 'bladeTPI', label: 'Blade TPI', unit: 'TPI' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
    ], formula: '(cutWidth + allowance) / feedRate' },
    { id: 'proc_saw_002', name: 'Circular Saw Cut-Off', group: 'Sawing', compatibleMachineTypes: ['Saw'], imageUrl: 'https://i.ibb.co/5Kh0k5Z/circular-saw.png', parameters: [
        { name: 'cutThickness', label: 'Cut Thickness', unit: 'mm' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
    ], formula: '(cutThickness + allowance) / feedRate' },
    { id: 'proc_saw_003', name: 'Abrasive Cut-Off', group: 'Sawing', compatibleMachineTypes: ['Saw', 'Grinder'], imageUrl: 'https://i.ibb.co/qC2P51s/abrasive-cutoff.png', parameters: [
        { name: 'cutThickness', label: 'Cut Thickness', unit: 'mm' },
        { name: 'feedRate', label: 'Feed Rate', unit: 'mm/min' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
    ], formula: '(feedRate > 0 ? (cutThickness + allowance) / feedRate : 0)' },
] as any;
export const DEFAULT_PROCESS_NAMES = new Set(DEFAULT_PROCESSES.map(p => p.name));


export const TOOL_TYPES = ['End Mill', 'Face Mill', 'Drill', 'Tap', 'Lathe Insert', 'Grooving Tool', 'Grinding Wheel', 'Hob Cutter', 'Shaper Cutter', 'Gear Form Cutter', 'Broach', 'Band Saw Blade', 'Circular Saw Blade'];
export const TOOL_MATERIALS = ['HSS', 'Cobalt', 'Carbide', 'PCD', 'CBN'];
export const ARBOR_OR_INSERT_OPTIONS: Tool['arborOrInsert'][] = ['Shank', 'Arbor', 'Insert'];

export const DEFAULT_TOOLS_MASTER: Tool[] = [
    // Milling
    { id: 'tool_001', name: 'Sandvik CoroMill Plura 10mm End Mill', brand: 'Sandvik', model: '2P342-1000-PA', toolType: 'End Mill', material: 'Carbide', diameter: 10, cornerRadius: 0.5, numberOfTeeth: 4, arborOrInsert: 'Shank', cuttingSpeedVc: 150, feedPerTooth: 0.06, compatibleMachineTypes: ['CNC Mill'], price: 95, estimatedLife: 50, speedRpm: null, feedRate: null },
    { id: 'tool_007', name: 'Seco 6mm Ball Nose End Mill', brand: 'Seco Tools', model: 'Jabro-Solid2 JS554', toolType: 'End Mill', material: 'Carbide', diameter: 6, cornerRadius: 3, numberOfTeeth: 4, arborOrInsert: 'Shank', cuttingSpeedVc: 180, feedPerTooth: 0.04, compatibleMachineTypes: ['CNC Mill'], price: 110, estimatedLife: 40, speedRpm: null, feedRate: null },
    { id: 'tool_004', name: 'Iscar HELIQUMILL 50mm Face Mill', brand: 'Iscar', model: 'HM90 F90A D50-5-22', toolType: 'Face Mill', material: 'Carbide', diameter: 50, cornerRadius: null, numberOfTeeth: 5, arborOrInsert: 'Arbor', cuttingSpeedVc: 200, feedPerTooth: 0.12, compatibleMachineTypes: ['CNC Mill'], price: 280, estimatedLife: 100, speedRpm: null, feedRate: null },
    
    // Hole Making
    { id: 'tool_002', name: 'Dormer A002 5mm HSS Drill', brand: 'Dormer', model: 'A0025.0', toolType: 'Drill', material: 'HSS', diameter: 5, cornerRadius: null, numberOfTeeth: 2, arborOrInsert: 'Shank', cuttingSpeedVc: 40, feedPerTooth: 0.1, compatibleMachineTypes: ['CNC Mill', 'CNC Lathe'], price: 15, estimatedLife: 200, speedRpm: null, feedRate: null },
    { id: 'tool_005', name: 'Guhring 10mm Carbide Drill', brand: 'Guhring', model: 'RT 100 U', toolType: 'Drill', material: 'Carbide', diameter: 10, cornerRadius: null, numberOfTeeth: 2, arborOrInsert: 'Shank', cuttingSpeedVc: 100, feedPerTooth: 0.15, compatibleMachineTypes: ['CNC Mill', 'CNC Lathe'], price: 75, estimatedLife: 300, speedRpm: null, feedRate: null },
    { id: 'tool_006', name: 'Emuge M10x1.5 Tap', brand: 'Emuge', model: 'Rekord B-VA', toolType: 'Tap', material: 'HSS', diameter: 10, cornerRadius: null, numberOfTeeth: 4, arborOrInsert: 'Shank', cuttingSpeedVc: 15, feedPerTooth: null, compatibleMachineTypes: ['CNC Mill'], price: 60, estimatedLife: 500, speedRpm: null, feedRate: null },

    // Turning
    { id: 'tool_003', name: 'Kennametal CNMG 12.7mm Insert', brand: 'Kennametal', model: 'CNMG120408', toolType: 'Lathe Insert', material: 'Carbide', diameter: 12.7, cornerRadius: 0.8, numberOfTeeth: 1, arborOrInsert: 'Insert', cuttingSpeedVc: 220, feedPerTooth: 0.25, compatibleMachineTypes: ['CNC Lathe'], price: 25, estimatedLife: 10, speedRpm: null, feedRate: null },
    { id: 'tool_008', name: 'Walter WNMG 12.7mm Insert', brand: 'Walter', model: 'WNMG080408-FP5', toolType: 'Lathe Insert', material: 'Carbide', diameter: 12.7, cornerRadius: 0.8, numberOfTeeth: 1, arborOrInsert: 'Insert', cuttingSpeedVc: 280, feedPerTooth: 0.3, compatibleMachineTypes: ['CNC Lathe'], price: 30, estimatedLife: 15, speedRpm: null, feedRate: null },
    { id: 'tool_009', name: 'Sandvik 3mm Grooving Insert', brand: 'Sandvik', model: 'CoroCut 2 N123G2', toolType: 'Grooving Tool', material: 'Carbide', diameter: 3, cornerRadius: 0.2, numberOfTeeth: 1, arborOrInsert: 'Insert', cuttingSpeedVc: 150, feedPerTooth: 0.1, compatibleMachineTypes: ['CNC Lathe'], price: 45, estimatedLife: 20, speedRpm: null, feedRate: null },

    // Grinding
    { id: 'tool_010', name: 'Norton 200mm Grinding Wheel', brand: 'Norton', model: '32A46-H8VBE', toolType: 'Grinding Wheel', material: 'CBN', diameter: 200, cornerRadius: null, numberOfTeeth: null, arborOrInsert: 'Arbor', cuttingSpeedVc: 3000, feedPerTooth: null, compatibleMachineTypes: ['Grinder'], price: 150, estimatedLife: 200, speedRpm: null, feedRate: null },
    
    // Sawing
    { id: 'tool_011', name: 'Amada SGLB 10 TPI Bandsaw Blade', brand: 'Amada', model: 'SGLB', toolType: 'Band Saw Blade', material: 'HSS', diameter: 27, cornerRadius: null, numberOfTeeth: 10, arborOrInsert: 'Shank', cuttingSpeedVc: 60, feedPerTooth: 0.05, compatibleMachineTypes: ['Saw'], price: 120, estimatedLife: 80, speedRpm: null, feedRate: null },
] as any;
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

export const DEFAULT_REGION_CURRENCY_MAP: RegionCurrencyMap[] = [
    { id: 'rcm_default', region: 'Default', currency: 'USD' },
    { id: 'rcm_us', region: 'United States', currency: 'USD' },
    { id: 'rcm_in', region: 'India', currency: 'INR' },
    { id: 'rcm_de', region: 'Germany', currency: 'EUR' },
] as any;

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        id: 'plan_001',
        name: 'Free',
        prices: { 
            USD: { price: 0 }, 
            EUR: { price: 0 }, 
            INR: { price: 0 } 
        },
        period: '',
        is_custom_price: false,
        calculation_limit: 5,
        features: ['Up to 5 calculations per month', 'Basic material library', 'Standard support'],
        cta: 'Get Started',
        most_popular: false,
    },
    {
        id: 'plan_002',
        name: 'Professional',
        prices: { 
            USD: { price: 49 }, 
            EUR: { price: 45 }, 
            INR: { price: 3900 } 
        },
        period: 'mo',
        is_custom_price: false,
        calculation_limit: 100,
        features: ['Up to 100 calculations per month', 'Full material & machine library', 'Priority support', 'Save & load calculations'],
        cta: 'Choose Pro',
        most_popular: true,
    },
    {
        id: 'plan_003',
        name: 'Enterprise',
        prices: {},
        period: 'yr',
        is_custom_price: true,
        calculation_limit: -1,
        features: ['Unlimited calculations', 'Custom feature development', 'Dedicated account manager', 'On-premise deployment option'],
        cta: 'Contact Us',
        most_popular: false,
    }
] as any;

export const SUPER_ADMIN_EMAILS = ['designersworldcbe@gmail.com', 'admin@costinghub.com', 'machinehourrate@gmail.com', 'gokulprasadrs20@gmail.com'];


// --- START OF NEW SHOWCASE TEMPLATES ---

const CNC_MILL_SHOWCASE: Calculation = {
  id: 'calc_master_mill_v1',
  inputs: {
    id: 'inputs_master_mill', calculationNumber: 'TPL-MILL-01', partNumber: 'HSG-01', partName: 'CNC Mill Showcase', customerName: 'Showcase Customer', revision: 'A',
    createdAt: new Date().toISOString(), annualVolume: 5000, batchVolume: 200, unitSystem: 'Metric', region: 'Default', currency: 'USD',
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
        { id: 'op_m3', processName: 'Drilling (on Mill)', toolId: 'tool_005', parameters: { holeDepth: 20, allowance: 2, numberOfHoles: 4 } },
      ]
    }]
  },
  status: 'final', user_id: 'system-default', created_at: '2025-01-01T00:00:00.000Z',
};

const CNC_LATHE_SHOWCASE: Calculation = {
  id: 'calc_master_lathe_v1',
  inputs: {
    id: 'inputs_master_lathe', calculationNumber: 'TPL-LATHE-01', partNumber: 'FLG-01', partName: 'CNC Lathe Showcase', customerName: 'Showcase Customer', revision: 'A',
    createdAt: new Date().toISOString(), annualVolume: 10000, batchVolume: 500, unitSystem: 'Metric', region: 'Default', currency: 'USD',
    materialCategory: 'M - Stainless Steel', materialType: 'mat_005',
    rawMaterialProcess: 'Billet', billetShape: 'Cylinder', billetShapeParameters: { diameter: 80, height: 40 },
    rawMaterialWeightKg: 1.61, finishedPartWeightKg: 1.2, partSurfaceAreaM2: 0.02, materialCostPerKg: 4.5, materialDensityGcm3: 8, transportCostPerKg: 0.2, heatTreatmentCostPerKg: 0,
    surfaceTreatments: [{ id: 'st1', name: 'Passivation', cost: 1, unit: 'per_kg', based_on: 'finished_weight' }],
    markups: { general: 5, admin: 10, sales: 5, miscellaneous: 1, packing: 2, transport: 4, profit: 25, duty: 0 },
    setups: [{
      id: 'setup_lathe_1', name: 'Turning Operations', machineId: 'mach_002', timePerSetupMin: 60, toolChangeTimeSec: 15, efficiency: 0.90,
      operations: [
        { id: 'op_l1', processName: 'Facing', toolId: 'tool_003', parameters: { facingDiameter: 80, feedPerRev: 0.2 } },
        { id: 'op_l2', processName: 'Turning (OD/ID)', toolId: 'tool_003', parameters: { turningLength: 35, diameterStart: 80, diameterEnd: 70, depthPerPass: 1, feedPerRev: 0.25 } },
        { id: 'op_l3', processName: 'Grooving', toolId: 'tool_009', parameters: { grooveDepth: 5, feedPerRev: 0.1 } },
      ]
    }]
  },
  status: 'final', user_id: 'system-default', created_at: '2025-01-01T00:00:00.000Z',
};

const SAW_SHOWCASE: Calculation = {
  id: 'calc_master_saw_v1',
  inputs: {
    id: 'inputs_master_saw', calculationNumber: 'TPL-SAW-01', partNumber: 'BLK-01', partName: 'Saw Cut-Off Showcase', customerName: 'Showcase Customer', revision: 'A',
    createdAt: new Date().toISOString(), annualVolume: 20000, batchVolume: 1000, unitSystem: 'Metric', region: 'Default', currency: 'USD',
    materialCategory: 'P - Steel', materialType: 'mat_001',
    rawMaterialProcess: 'Billet', billetShape: 'Bar', billetShapeParameters: { length: 1000, width: 50, height: 50 },
    rawMaterialWeightKg: 19.68, finishedPartWeightKg: 0.98, partSurfaceAreaM2: 0, materialCostPerKg: 1.5, materialDensityGcm3: 7.87, transportCostPerKg: 0.1, heatTreatmentCostPerKg: 0,
    surfaceTreatments: [],
    markups: { general: 2, admin: 5, sales: 5, miscellaneous: 1, packing: 1, transport: 3, profit: 15, duty: 0 },
    setups: [{
      id: 'setup_saw_1', name: 'Sawing Operation', machineId: 'mach_003', timePerSetupMin: 15, toolChangeTimeSec: 0, efficiency: 1,
      operations: [{ id: 'op_s1', processName: 'Band Saw Cut-Off', toolId: 'tool_011', parameters: { cutWidth: 50, bladeTPI: 10, allowance: 5 } }]
    }]
  },
  status: 'final', user_id: 'system-default', created_at: '2025-01-01T00:00:00.000Z',
};

const GEAR_CUTTER_SHOWCASE: Calculation = {
  id: 'calc_master_gear_v1',
  inputs: {
    id: 'inputs_master_gear', calculationNumber: 'TPL-GEAR-01', partNumber: 'GEAR-01', partName: 'Gear Hobbing Showcase', customerName: 'Showcase Customer', revision: 'A',
    createdAt: new Date().toISOString(), annualVolume: 2000, batchVolume: 100, unitSystem: 'Metric', region: 'Default', currency: 'USD',
    materialCategory: 'P - Steel', materialType: 'mat_003',
    rawMaterialProcess: 'Forging', billetShape: undefined, billetShapeParameters: undefined,
    rawMaterialWeightKg: 2.5, finishedPartWeightKg: 2.1, partSurfaceAreaM2: 0.04, materialCostPerKg: 3.5, materialDensityGcm3: 7.85, transportCostPerKg: 0.2, heatTreatmentCostPerKg: 1.5,
    surfaceTreatments: [{ id: 'st1', name: 'Carburizing', cost: 3, unit: 'per_kg', based_on: 'finished_weight' }],
    markups: { general: 5, admin: 10, sales: 8, miscellaneous: 3, packing: 4, transport: 6, profit: 30, duty: 5 },
    setups: [{
      id: 'setup_gear_1', name: 'Gear Hobbing', machineId: 'mach_009', timePerSetupMin: 90, toolChangeTimeSec: 120, efficiency: 0.85,
      operations: [{ id: 'op_g1', processName: 'Gear Hobbing', toolId: 'tool_001', parameters: { faceWidthB: 40, feedPerRevFa: 1.5, allowance: 10, numberOfPasses: 1 } }]
    }]
  },
  status: 'final', user_id: 'system-default', created_at: '2025-01-01T00:00:00.000Z',
};

const GRINDER_SHOWCASE: Calculation = {
  id: 'calc_master_grinder_v1',
  inputs: {
    id: 'inputs_master_grinder', calculationNumber: 'TPL-GRIND-01', partNumber: 'PIN-01', partName: 'Surface Grinding Showcase', customerName: 'Showcase Customer', revision: 'A',
    createdAt: new Date().toISOString(), annualVolume: 15000, batchVolume: 1000, unitSystem: 'Metric', region: 'Default', currency: 'USD',
    materialCategory: 'H - Hardened Steel', materialType: 'mat_016',
    rawMaterialProcess: 'Billet', billetShape: 'Block', billetShapeParameters: { length: 60, width: 60, height: 25 },
    rawMaterialWeightKg: 0.71, finishedPartWeightKg: 0.7, partSurfaceAreaM2: 0, materialCostPerKg: 3.5, materialDensityGcm3: 7.85, transportCostPerKg: 0.2, heatTreatmentCostPerKg: 2,
    surfaceTreatments: [],
    markups: { general: 3, admin: 7, sales: 5, miscellaneous: 2, packing: 2, transport: 3, profit: 22, duty: 0 },
    setups: [{
      id: 'setup_grinder_1', name: 'Grinding Operation', machineId: 'mach_008', timePerSetupMin: 30, toolChangeTimeSec: 0, efficiency: 0.98,
      operations: [{ id: 'op_gr1', processName: 'Surface Grinding (Reciprocating)', toolId: 'tool_010', parameters: { lengthL: 60, widthW: 60, stockToRemoveSr: 0.1, depthOfCutAp: 0.01, tableSpeedVw: 6000, overlapRatioU: 0.3, sparkOutStrokesNso: 3, allowance: 10, handlingTime: 0.2, dressingTime: 2, partsBetweenDress: 100 } }]
    }]
  },
  status: 'final', user_id: 'system-default', created_at: '2025-01-01T00:00:00.000Z',
};


export const DEFAULT_CALCULATIONS_SHOWCASE: Calculation[] = [
  CNC_MILL_SHOWCASE,
  CNC_LATHE_SHOWCASE,
  SAW_SHOWCASE,
  GEAR_CUTTER_SHOWCASE,
  GRINDER_SHOWCASE,
];

export const DEFAULT_CALCULATION_IDS = new Set(DEFAULT_CALCULATIONS_SHOWCASE.map(c => c.id));

export const COUNTRY_CURRENCY_MAPPING = [
  { country: 'India', currency: 'INR' }, { country: 'United States', currency: 'USD' }, { country: 'United Kingdom', currency: 'GBP' },
  { country: 'Eurozone', currency: 'EUR' }, { country: 'Germany', currency: 'EUR' }, { country: 'France', currency: 'EUR' }, { country: 'Italy', currency: 'EUR' },
  { country: 'Japan', currency: 'JPY' }, { country: 'China', currency: 'CNY' }, { country: 'Canada', currency: 'CAD' }, { country: 'Australia', currency: 'AUD' },
  { country: 'Singapore', currency: 'SGD' }, { country: 'Malaysia', currency: 'MYR' }, { country: 'Thailand', currency: 'THB' }, { country: 'Indonesia', currency: 'IDR' },
  { country: 'United Arab Emirates', currency: 'AED' }, { country: 'Saudi Arabia', currency: 'SAR' }, { country: 'South Africa', currency: 'ZAR' },
  { country: 'Switzerland', currency: 'CHF' }, { country: 'Russia', currency: 'RUB' }, { country: 'Brazil', currency: 'BRL' }, { country: 'Mexico', currency: 'MXN' },
  { country: 'South Korea', currency: 'KRW' }, { country: 'Turkey', currency: 'TRY' }, { country: 'New Zealand', currency: 'NZD' }, { country: 'Hong Kong', currency: 'HKD' },
  { country: 'Vietnam', currency: 'VND' }, { country: 'Philippines', currency: 'PHP' }, { country: 'Bangladesh', currency: 'BDT' }, { country: 'Pakistan', currency: 'PKR' },
  { country: 'Sri Lanka', currency: 'LKR' }, { country: 'Nepal', currency: 'NPR' }, { country: 'Egypt', currency: 'EGP' }, { country: 'Nigeria', currency: 'NGN' },
  { country: 'Kenya', currency: 'KES' }, { country: 'Qatar', currency: 'QAR' }, { country: 'Oman', currency: 'OMR' }, { country: 'Kuwait', currency: 'KWD' },
  { country: 'Bahrain', currency: 'BHD' }, { country: 'Israel', currency: 'ILS' }, { country: 'Norway', currency: 'NOK' }, { country: 'Sweden', currency: 'SEK' },
  { country: 'Denmark', currency: 'DKK' }, { country: 'Poland', currency: 'PLN' }, { country: 'Czech Republic', currency: 'CZK' }, { country: 'Hungary', currency: 'HUF' },
  { country: 'Romania', currency: 'RON' }, { country: 'Ukraine', currency: 'UAH' }, { country: 'Argentina', currency: 'ARS' }, { country: 'Chile', currency: 'CLP' },
  { country: 'Colombia', currency: 'COP' }, { country: 'Peru', currency: 'PEN' }, { country: 'Venezuela', currency: 'VES' }, { country: 'Ghana', currency: 'GHS' },
  { country: 'Ethiopia', currency: 'ETB' }, { country: 'Tanzania', currency: 'TZS' }, { country: 'Uganda', currency: 'UGX' }, { country: 'Morocco', currency: 'MAD' },
  { country: 'Algeria', currency: 'DZD' }, { country: 'Tunisia', currency: 'TND' }, { country: 'Iran', currency: 'IRR' }, { country: 'Iraq', currency: 'IQD' },
  { country: 'Jordan', currency: 'JOD' }, { country: 'Lebanon', currency: 'LBP' }, { country: 'Myanmar', currency: 'MMK' }, { country: 'Cambodia', currency: 'KHR' },
  { country: 'Laos', currency: 'LAK' }, { country: 'Mongolia', currency: 'MNT' }, { country: 'Kazakhstan', currency: 'KZT' }, { country: 'Uzbekistan', currency: 'UZS' },
  { country: 'Georgia', currency: 'GEL' },
].sort((a, b) => a.country.localeCompare(b.country));


export const COUNTRIES = [
    { name: 'Afghanistan', code: 'AF', dial_code: '+93' }, { name: 'Albania', code: 'AL', dial_code: '+355' },
    { name: 'Algeria', code: 'DZ', dial_code: '+213' }, { name: 'American Samoa', code: 'AS', dial_code: '+1-684' },
    { name: 'Andorra', code: 'AD', dial_code: '+376' }, { name: 'Angola', code: 'AO', dial_code: '+244' },
    { name: 'Anguilla', code: 'AI', dial_code: '+1-264' }, { name: 'Antarctica', code: 'AQ', dial_code: '+672' },
    { name: 'Antigua and Barbuda', code: 'AG', dial_code: '+1-268' }, { name: 'Argentina', code: 'AR', dial_code: '+54' },
    { name: 'Armenia', code: 'AM', dial_code: '+374' }, { name: 'Aruba', code: 'AW', dial_code: '+297' },
    { name: 'Australia', code: 'AU', dial_code: '+61' }, { name: 'Austria', code: 'AT', dial_code: '+43' },
    { name: 'Azerbaijan', code: 'AZ', dial_code: '+994' }, { name: 'Bahamas', code: 'BS', dial_code: '+1-242' },
    { name: 'Bahrain', code: 'BH', dial_code: '+973' }, { name: 'Bangladesh', code: 'BD', dial_code: '+880' },
    { name: 'Barbados', code: 'BB', dial_code: '+1-246' }, { name: 'Belarus', code: 'BY', dial_code: '+375' },
    { name: 'Belgium', code: 'BE', dial_code: '+32' }, { name: 'Belize', code: 'BZ', dial_code: '+501' },
    { name: 'Benin', code: 'BJ', dial_code: '+229' }, { name: 'Bermuda', code: 'BM', dial_code: '+1-441' },
    { name: 'Bhutan', code: 'BT', dial_code: '+975' }, { name: 'Bolivia', code: 'BO', dial_code: '+591' },
    { name: 'Bosnia and Herzegovina', code: 'BA', dial_code: '+387' }, { name: 'Botswana', code: 'BW', dial_code: '+267' },
    { name: 'Brazil', code: 'BR', dial_code: '+55' }, { name: 'British Indian Ocean Territory', code: 'IO', dial_code: '+246' },
    { name: 'British Virgin Islands', code: 'VG', dial_code: '+1-284' }, { name: 'Brunei', code: 'BN', dial_code: '+673' },
    { name: 'Bulgaria', code: 'BG', dial_code: '+359' }, { name: 'Burkina Faso', code: 'BF', dial_code: '+226' },
    { name: 'Burundi', code: 'BI', dial_code: '+257' }, { name: 'Cambodia', code: 'KH', dial_code: '+855' },
    { name: 'Cameroon', code: 'CM', dial_code: '+237' }, { name: 'Canada', code: 'CA', dial_code: '+1' },
    { name: 'Cape Verde', code: 'CV', dial_code: '+238' }, { name: 'Cayman Islands', code: 'KY', dial_code: '+1-345' },
    { name: 'Central African Republic', code: 'CF', dial_code: '+236' }, { name: 'Chad', code: 'TD', dial_code: '+235' },
    { name: 'Chile', code: 'CL', dial_code: '+56' }, { name: 'China', code: 'CN', dial_code: '+86' },
    { name: 'Christmas Island', code: 'CX', dial_code: '+61' }, { name: 'Cocos Islands', code: 'CC', dial_code: '+61' },
    { name: 'Colombia', code: 'CO', dial_code: '+57' }, { name: 'Comoros', code: 'KM', dial_code: '+269' },
    { name: 'Cook Islands', code: 'CK', dial_code: '+682' }, { name: 'Costa Rica', code: 'CR', dial_code: '+506' },
    { name: 'Croatia', code: 'HR', dial_code: '+385' }, { name: 'Cuba', code: 'CU', dial_code: '+53' },
    { name: 'Curacao', code: 'CW', dial_code: '+599' }, { name: 'Cyprus', code: 'CY', dial_code: '+357' },
    { name: 'Czech Republic', code: 'CZ', dial_code: '+420' }, { name: 'Democratic Republic of the Congo', code: 'CD', dial_code: '+243' },
    { name: 'Denmark', code: 'DK', dial_code: '+45' }, { name: 'Djibouti', code: 'DJ', dial_code: '+253' },
    { name: 'Dominica', code: 'DM', dial_code: '+1-767' }, { name: 'Dominican Republic', code: 'DO', dial_code: '+1-809' },
    { name: 'East Timor', code: 'TL', dial_code: '+670' }, { name: 'Ecuador', code: 'EC', dial_code: '+593' },
    { name: 'Egypt', code: 'EG', dial_code: '+20' }, { name: 'El Salvador', code: 'SV', dial_code: '+503' },
    { name: 'Equatorial Guinea', code: 'GQ', dial_code: '+240' }, { name: 'Eritrea', code: 'ER', dial_code: '+291' },
    { name: 'Estonia', code: 'EE', dial_code: '+372' }, { name: 'Ethiopia', code: 'ET', dial_code: '+251' },
    { name: 'Falkland Islands', code: 'FK', dial_code: '+500' }, { name: 'Faroe Islands', code: 'FO', dial_code: '+298' },
    { name: 'Fiji', code: 'FJ', dial_code: '+679' }, { name: 'Finland', code: 'FI', dial_code: '+358' },
    { name: 'France', code: 'FR', dial_code: '+33' }, { name: 'French Polynesia', code: 'PF', dial_code: '+689' },
    { name: 'Gabon', code: 'GA', dial_code: '+241' }, { name: 'Gambia', code: 'GM', dial_code: '+220' },
    { name: 'Georgia', code: 'GE', dial_code: '+995' }, { name: 'Germany', code: 'DE', dial_code: '+49' },
    { name: 'Ghana', code: 'GH', dial_code: '+233' }, { name: 'Gibraltar', code: 'GI', dial_code: '+350' },
    { name: 'Greece', code: 'GR', dial_code: '+30' }, { name: 'Greenland', code: 'GL', dial_code: '+299' },
    { name: 'Grenada', code: 'GD', dial_code: '+1-473' }, { name: 'Guam', code: 'GU', dial_code: '+1-671' },
    { name: 'Guatemala', code: 'GT', dial_code: '+502' }, { name: 'Guernsey', code: 'GG', dial_code: '+44-1481' },
    { name: 'Guinea', code: 'GN', dial_code: '+224' }, { name: 'Guinea-Bissau', code: 'GW', dial_code: '+245' },
    { name: 'Guyana', code: 'GY', dial_code: '+592' }, { name: 'Haiti', code: 'HT', dial_code: '+509' },
    { name: 'Honduras', code: 'HN', dial_code: '+504' }, { name: 'Hong Kong', code: 'HK', dial_code: '+852' },
    { name: 'Hungary', code: 'HU', dial_code: '+36' }, { name: 'Iceland', code: 'IS', dial_code: '+354' },
    { name: 'India', code: 'IN', dial_code: '+91' }, { name: 'Indonesia', code: 'ID', dial_code: '+62' },
    { name: 'Iran', code: 'IR', dial_code: '+98' }, { name: 'Iraq', code: 'IQ', dial_code: '+964' },
    { name: 'Ireland', code: 'IE', dial_code: '+353' }, { name: 'Isle of Man', code: 'IM', dial_code: '+44-1624' },
    { name: 'Israel', code: 'IL', dial_code: '+972' }, { name: 'Italy', code: 'IT', dial_code: '+39' },
    { name: 'Ivory Coast', code: 'CI', dial_code: '+225' }, { name: 'Jamaica', code: 'JM', dial_code: '+1-876' },
    { name: 'Japan', code: 'JP', dial_code: '+81' }, { name: 'Jersey', code: 'JE', dial_code: '+44-1534' },
    { name: 'Jordan', code: 'JO', dial_code: '+962' }, { name: 'Kazakhstan', code: 'KZ', dial_code: '+7' },
    { name: 'Kenya', code: 'KE', dial_code: '+254' }, { name: 'Kiribati', code: 'KI', dial_code: '+686' },
    { name: 'Kosovo', code: 'XK', dial_code: '+383' }, { name: 'Kuwait', code: 'KW', dial_code: '+965' },
    { name: 'Kyrgyzstan', code: 'KG', dial_code: '+996' }, { name: 'Laos', code: 'LA', dial_code: '+856' },
    { name: 'Latvia', code: 'LV', dial_code: '+371' }, { name: 'Lebanon', code: 'LB', dial_code: '+961' },
    { name: 'Lesotho', code: 'LS', dial_code: '+266' }, { name: 'Liberia', code: 'LR', dial_code: '+231' },
    { name: 'Libya', code: 'LY', dial_code: '+218' }, { name: 'Liechtenstein', code: 'LI', dial_code: '+423' },
    { name: 'Lithuania', code: 'LT', dial_code: '+370' }, { name: 'Luxembourg', code: 'LU', dial_code: '+352' },
    { name: 'Macau', code: 'MO', dial_code: '+853' }, { name: 'Macedonia', code: 'MK', dial_code: '+389' },
    { name: 'Madagascar', code: 'MG', dial_code: '+261' }, { name: 'Malawi', code: 'MW', dial_code: '+265' },
    { name: 'Malaysia', code: 'MY', dial_code: '+60' }, { name: 'Maldives', code: 'MV', dial_code: '+960' },
    { name: 'Mali', code: 'ML', dial_code: '+223' }, { name: 'Malta', code: 'MT', dial_code: '+356' },
    { name: 'Marshall Islands', code: 'MH', dial_code: '+692' }, { name: 'Mauritania', code: 'MR', dial_code: '+222' },
    { name: 'Mauritius', code: 'MU', dial_code: '+230' }, { name: 'Mayotte', code: 'YT', dial_code: '+262' },
    { name: 'Mexico', code: 'MX', dial_code: '+52' }, { name: 'Micronesia', code: 'FM', dial_code: '+691' },
    { name: 'Moldova', code: 'MD', dial_code: '+373' }, { name: 'Monaco', code: 'MC', dial_code: '+377' },
    { name: 'Mongolia', code: 'MN', dial_code: '+976' }, { name: 'Montenegro', code: 'ME', dial_code: '+382' },
    { name: 'Montserrat', code: 'MS', dial_code: '+1-664' }, { name: 'Morocco', code: 'MA', dial_code: '+212' },
    { name: 'Mozambique', code: 'MZ', dial_code: '+258' }, { name: 'Myanmar', code: 'MM', dial_code: '+95' },
    { name: 'Namibia', code: 'NA', dial_code: '+264' }, { name: 'Nauru', code: 'NR', dial_code: '+674' },
    { name: 'Nepal', code: 'NP', dial_code: '+977' }, { name: 'Netherlands', code: 'NL', dial_code: '+31' },
    { name: 'Netherlands Antilles', code: 'AN', dial_code: '+599' }, { name: 'New Caledonia', code: 'NC', dial_code: '+687' },
    { name: 'New Zealand', code: 'NZ', dial_code: '+64' }, { name: 'Nicaragua', code: 'NI', dial_code: '+505' },
    { name: 'Niger', code: 'NE', dial_code: '+227' }, { name: 'Nigeria', code: 'NG', dial_code: '+234' },
    { name: 'Niue', code: 'NU', dial_code: '+683' }, { name: 'North Korea', code: 'KP', dial_code: '+850' },
    { name: 'Northern Mariana Islands', code: 'MP', dial_code: '+1-670' }, { name: 'Norway', code: 'NO', dial_code: '+47' },
    { name: 'Oman', code: 'OM', dial_code: '+968' }, { name: 'Pakistan', code: 'PK', dial_code: '+92' },
    { name: 'Palau', code: 'PW', dial_code: '+680' }, { name: 'Palestine', code: 'PS', dial_code: '+970' },
    { name: 'Panama', code: 'PA', dial_code: '+507' }, { name: 'Papua New Guinea', code: 'PG', dial_code: '+675' },
    { name: 'Paraguay', code: 'PY', dial_code: '+595' }, { name: 'Peru', code: 'PE', dial_code: '+51' },
    { name: 'Philippines', code: 'PH', dial_code: '+63' }, { name: 'Pitcairn', code: 'PN', dial_code: '+64' },
    { name: 'Poland', code: 'PL', dial_code: '+48' }, { name: 'Portugal', code: 'PT', dial_code: '+351' },
    { name: 'Puerto Rico', code: 'PR', dial_code: '+1-787' }, { name: 'Qatar', code: 'QA', dial_code: '+974' },
    { name: 'Republic of the Congo', code: 'CG', dial_code: '+242' }, { name: 'Reunion', code: 'RE', dial_code: '+262' },
    { name: 'Romania', code: 'RO', dial_code: '+40' }, { name: 'Russia', code: 'RU', dial_code: '+7' },
    { name: 'Rwanda', code: 'RW', dial_code: '+250' }, { name: 'Saint Barthelemy', code: 'BL', dial_code: '+590' },
    { name: 'Saint Helena', code: 'SH', dial_code: '+290' }, { name: 'Saint Kitts and Nevis', code: 'KN', dial_code: '+1-869' },
    { name: 'Saint Lucia', code: 'LC', dial_code: '+1-758' }, { name: 'Saint Martin', code: 'MF', dial_code: '+590' },
    { name: 'Saint Pierre and Miquelon', code: 'PM', dial_code: '+508' }, { name: 'Saint Vincent and the Grenadines', code: 'VC', dial_code: '+1-784' },
    { name: 'Samoa', code: 'WS', dial_code: '+685' }, { name: 'San Marino', code: 'SM', dial_code: '+378' },
    { name: 'Sao Tome and Principe', code: 'ST', dial_code: '+239' }, { name: 'Saudi Arabia', code: 'SA', dial_code: '+966' },
    { name: 'Senegal', code: 'SN', dial_code: '+221' }, { name: 'Serbia', code: 'RS', dial_code: '+381' },
    { name: 'Seychelles', code: 'SC', dial_code: '+248' }, { name: 'Sierra Leone', code: 'SL', dial_code: '+232' },
    { name: 'Singapore', code: 'SG', dial_code: '+65' }, { name: 'Sint Maarten', code: 'SX', dial_code: '+1-721' },
    { name: 'Slovakia', code: 'SK', dial_code: '+421' }, { name: 'Slovenia', code: 'SI', dial_code: '+386' },
    { name: 'Solomon Islands', code: 'SB', dial_code: '+677' }, { name: 'Somalia', code: 'SO', dial_code: '+252' },
    { name: 'South Africa', code: 'ZA', dial_code: '+27' }, { name: 'South Korea', code: 'KR', dial_code: '+82' },
    { name: 'South Sudan', code: 'SS', dial_code: '+211' }, { name: 'Spain', code: 'ES', dial_code: '+34' },
    { name: 'Sri Lanka', code: 'LK', dial_code: '+94' }, { name: 'Sudan', code: 'SD', dial_code: '+249' },
    { name: 'Suriname', code: 'SR', dial_code: '+597' }, { name: 'Svalbard and Jan Mayen', code: 'SJ', dial_code: '+47' },
    { name: 'Swaziland', code: 'SZ', dial_code: '+268' }, { name: 'Sweden', code: 'SE', dial_code: '+46' },
    { name: 'Switzerland', code: 'CH', dial_code: '+41' }, { name: 'Syria', code: 'SY', dial_code: '+963' },
    { name: 'Taiwan', code: 'TW', dial_code: '+886' }, { name: 'Tajikistan', code: 'TJ', dial_code: '+992' },
    { name: 'Tanzania', code: 'TZ', dial_code: '+255' }, { name: 'Thailand', code: 'TH', dial_code: '+66' },
    { name: 'Togo', code: 'TG', dial_code: '+228' }, { name: 'Tokelau', code: 'TK', dial_code: '+690' },
    { name: 'Tonga', code: 'TO', dial_code: '+676' }, { name: 'Trinidad and Tobago', code: 'TT', dial_code: '+1-868' },
    { name: 'Tunisia', code: 'TN', dial_code: '+216' }, { name: 'Turkey', code: 'TR', dial_code: '+90' },
    { name: 'Turkmenistan', code: 'TM', dial_code: '+993' }, { name: 'Turks and Caicos Islands', code: 'TC', dial_code: '+1-649' },
    { name: 'Tuvalu', code: 'TV', dial_code: '+688' }, { name: 'U.S. Virgin Islands', code: 'VI', dial_code: '+1-340' },
    { name: 'Uganda', code: 'UG', dial_code: '+256' }, { name: 'Ukraine', code: 'UA', dial_code: '+380' },
    { name: 'United Arab Emirates', code: 'AE', dial_code: '+971' }, { name: 'United Kingdom', code: 'GB', dial_code: '+44' },
    { name: 'United States', code: 'US', dial_code: '+1' }, { name: 'Uruguay', code: 'UY', dial_code: '+598' },
    { name: 'Uzbekistan', code: 'UZ', dial_code: '+998' }, { name: 'Vanuatu', code: 'VU', dial_code: '+678' },
    { name: 'Vatican', code: 'VA', dial_code: '+379' }, { name: 'Venezuela', code: 'VE', dial_code: '+58' },
    { name: 'Vietnam', code: 'VN', dial_code: '+84' }, { name: 'Wallis and Futuna', code: 'WF', dial_code: '+681' },
    { name: 'Western Sahara', code: 'EH', dial_code: '+212' }, { name: 'Yemen', code: 'YE', dial_code: '+967' },
    { name: 'Zambia', code: 'ZM', dial_code: '+260' }, { name: 'Zimbabwe', code: 'ZW', dial_code: '+263' },
].sort((a, b) => a.name.localeCompare(b.name));

// Base rates relative to USD. In a real app, this would come from an API.
export const CURRENCY_CONVERSION_RATES_TO_USD: { [key: string]: number } = {
  USD: 1, EUR: 1.07, GBP: 1.27, INR: 0.012, CAD: 0.73, AUD: 0.66, JPY: 0.0064, CNY: 0.14,
  SGD: 0.74, MYR: 0.21, THB: 0.027, IDR: 0.000061, AED: 0.27, SAR: 0.27, ZAR: 0.053,
  CHF: 1.10, RUB: 0.011, BRL: 0.18, MXN: 0.054, KRW: 0.00072, TRY: 0.030, NZD: 0.61,
  HKD: 0.13, VND: 0.000039, PHP: 0.017, BDT: 0.0085, PKR: 0.0036, LKR: 0.0033, NPR: 0.0075,
  EGP: 0.021, NGN: 0.00067, KES: 0.0077, QAR: 0.27, OMR: 2.60, KWD: 3.26, BHD: 2.65,
  ILS: 0.27, NOK: 0.094, SEK: 0.095, DKK: 0.14, PLN: 0.25, CZK: 0.043, HUF: 0.0027,
  RON: 0.22, UAH: 0.025, ARS: 0.0011, CLP: 0.0011, COP: 0.00025, PEN: 0.27, VES: 0.027,
  GHS: 0.067, ETB: 0.017, TZS: 0.00038, UGX: 0.00027, MAD: 0.10, DZD: 0.0074, TND: 0.32,
  IRR: 0.000024, IQD: 0.00076, JOD: 1.41, LBP: 0.000011, MMK: 0.00048, KHR: 0.00024,
  LAK: 0.000046, MNT: 0.00029, KZT: 0.0022, UZS: 0.000079, GEL: 0.35
};

export const ALL_CURRENCIES = [...new Set(COUNTRY_CURRENCY_MAPPING.map(c => c.currency))].sort();

export const CURRENCIES = Object.keys(CURRENCY_CONVERSION_RATES_TO_USD);

export const CHANGELOG_DATA: ChangelogEntry[] = [
    {
        version: "1.2.3",
        date: "2025-11-18",
        title: "UI Enhancements & Layout Updates",
        changes: [
            { type: "improvement", description: "Updated the User Feedback page to a balanced, two-column layout for improved readability on larger screens." },
        ]
    },
    {
        version: "1.2.2",
        date: "2025-11-11",
        title: "Flexible Region and Currency Management",
        changes: [
            { type: "improvement", description: "Removed the pre-defined region dropdown. Users can now add any custom region name via a text input on the 'Regions & Currencies' page for full flexibility." },
            { type: "new", description: "Currency is now automatically suggested when a recognized country is entered as a region." },
            { type: "improvement", description: "Enabled manual currency selection on the Calculator page, allowing users to override the region's default for specific calculations." },
            { type: "fix", description: "Improved validation to prevent duplicate custom regions for a user's account." },
        ]
    },
    {
        version: "1.2.1",
        date: "2025-08-22",
        title: "Code Refinements & Bug Fixes",
        changes: [
            { type: "fix", description: "Resolved multiple TypeScript type errors throughout the application for improved stability and developer experience." },
            { type: "fix", description: "Corrected a malformed data object in the changelog configuration that caused a display issue." },
            { type: "improvement", description: "Updated changelog dates to accurately reflect the development timeline." },
            { type: "new", description: "Subscription expiration date is now displayed on the user's Settings page." }
        ]
    },
    {
        version: "1.2.0",
        date: "2025-08-19",
        title: "AI-Powered Tool Life Estimation & Subscription Management",
        changes: [
            { type: "new", description: "Added an 'AI Calc' button in the Tool Library to estimate tool life in hours using the Gemini API." },
            { type: "new", description: "Introduced a 'Expires On' column in the User Management list for super admins to track subscription end dates." },
            { type: "improvement", description: "Subscription expiration dates are now automatically calculated and assigned based on the plan (e.g., 1 year for Free, monthly/yearly for paid plans)." },
            { type: "improvement", description: "Expiration dates are now color-coded in the user list: red for expired, yellow for expiring within 7 days." },
            { type: "fix", description: "Resolved an issue where 'N/A' was shown for expiration dates; fallbacks are now calculated for display." }
        ]
    },
    {
        version: "1.1.0",
        date: "2025-08-05",
        title: "Enhanced Feedback System & Cost Management",
        changes: [
            { type: "new", description: "User Feedback can now be viewed by super admins on a dedicated page with a master-detail layout." },
            { type: "improvement", description: "Clicking a feedback item now shows the full details on the same page, replacing the previous modal popup." },
            { type: "fix", description: "Fixed a database constraint error by making 'Region & Currency' mapping a global, admin-managed feature." },
            { type: "improvement", description: "Default library prices for materials, machines, and tools are now automatically associated with the 'United States' region." },
            { type: "improvement", description: "A 'Default' badge is now shown next to the 'United States' price in the Cost Master to clarify it as the base price." }
        ]
    },
    {
        version: "1.0.0",
        date: "2025-07-15",
        title: "Initial Launch of CostingHub",
        changes: [
            { type: "new", description: "Launch of the Machining Cost Calculator with core functionalities." },
            { type: "new", description: "User authentication and profile management." },
            { type: "new", description: "Libraries for Materials, Machines, Processes, and Tools." },
            { type: "new", description: "Subscription plans (Free, Professional, Enterprise)." },
            { type: "new", description: "Super Admin panel for managing plans and users." }
        ]
    }
];