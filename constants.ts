import type { MaterialProperty, MaterialMasterItem, Machine, Process, SubscriptionPlan, Tool, Calculation, MachiningInput, MachiningResult } from "./types";

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


// FIX: Cast to `any` to bypass strict type check for seed data missing db-generated columns like `created_at` and `user_id`.
export const INITIAL_MATERIALS_MASTER: MaterialMasterItem[] = rawMaterialsData.map(material => {
  const newProperties: { [key: string]: MaterialProperty } = {};
  for (const [key, value] of Object.entries(material.properties)) {
    // FIX: Cast `value` from `unknown` to the type expected by `parsePropertyValue`.
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
export const DEFAULT_MATERIAL_IDS = new Set(INITIAL_MATERIALS_MASTER.map(m => m.id));

// FIX: Cast to `any` to bypass strict type check for seed data missing db-generated columns.
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
export const DEFAULT_MACHINE_IDS = new Set(DEFAULT_MACHINES_MASTER.map(m => m.id));

export const MACHINE_TYPES = ['CNC Mill', 'CNC Lathe', 'Grinder', 'Saw', 'Gear Cutter'];
export const ADDITIONAL_AXIS_OPTIONS = ['None', '4th', '5th', 'Y-Axis'];

export const DEFAULT_PROCESSES: Process[] = [
    // --- MILLING ---
    { id: 'proc_cncmill_001', name: 'Face Milling', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], parameters: [
        { name: 'faceLength', label: 'Face Length (Lp)', unit: 'mm' },
        { name: 'faceWidth', label: 'Face Width (W)', unit: 'mm' },
        { name: 'depthOfCut', label: 'Depth of Cut (ap)', unit: 'mm' },
        { name: 'radialEngagement', label: 'Radial Engagement (ae)', unit: 'mm' },
    ], formula: '(Math.ceil(faceWidth / (radialEngagement || toolDiameter * 0.75)) * (faceLength + toolDiameter)) / feedRate' },
    { id: 'proc_cncmill_002', name: 'Peripheral Milling', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], parameters: [
        { name: 'edgeLength', label: 'Edge Length', unit: 'mm' },
        { name: 'totalDepth', label: 'Total Depth (t)', unit: 'mm' },
        { name: 'depthPerPass', label: 'Depth per Pass (ap)', unit: 'mm' },
    ], formula: '((edgeLength + toolDiameter) * Math.ceil(totalDepth / depthPerPass)) / feedRate' },
    { id: 'proc_cncmill_003', name: 'Slot Milling', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], parameters: [
        { name: 'slotLength', label: 'Slot Length', unit: 'mm' },
        { name: 'slotDepth', label: 'Slot Depth (t)', unit: 'mm' },
        { name: 'depthPerPass', label: 'Depth per Pass (ap)', unit: 'mm' },
    ], formula: '((slotLength + toolDiameter) * Math.ceil(slotDepth / depthPerPass)) / feedRate' },
    { id: 'proc_cncmill_004', name: 'Pocketing (MRR)', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], parameters: [
        { name: 'pocketLength', label: 'Pocket Length', unit: 'mm' },
        { name: 'pocketWidth', label: 'Pocket Width', unit: 'mm' },
        { name: 'pocketDepth', label: 'Pocket Depth', unit: 'mm' },
        { name: 'radialEngagement', label: 'Radial Engagement (ae)', unit: 'mm' },
        { name: 'axialEngagement', label: 'Axial Engagement (ap)', unit: 'mm' },
    ], formula: '((pocketLength * pocketWidth * pocketDepth) / (axialEngagement * radialEngagement * feedRate))' },
    { id: 'proc_cncmill_005', name: 'Profiling / Contouring', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], parameters: [
        { name: 'perimeter', label: 'Perimeter (P)', unit: 'mm' },
        { name: 'totalDepth', label: 'Total Depth (t)', unit: 'mm' },
        { name: 'depthPerPass', label: 'Depth per Pass (ap)', unit: 'mm' },
    ], formula: '((perimeter + toolDiameter) * Math.ceil(totalDepth / depthPerPass)) / feedRate' },
    { id: 'proc_cncmill_006', name: 'Chamfer Milling', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], parameters: [
        { name: 'edgeLength', label: 'Edge Length', unit: 'mm' },
    ], formula: '((edgeLength + toolDiameter) / feedRate)' },
    { id: 'proc_cncmill_007', name: 'Fillet/Radius Milling', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], parameters: [
        { name: 'arcLength', label: 'Total Arc Length', unit: 'mm' },
        { name: 'numberOfCorners', label: 'Number of Corners', unit: 'count' },
    ], formula: '((arcLength + (numberOfCorners * toolDiameter)) / feedRate)' },
    { id: 'proc_cncmill_010', name: 'Engraving', group: 'Milling', compatibleMachineTypes: ['CNC Mill'], parameters: [
        { name: 'totalPathLength', label: 'Total Path Length', unit: 'mm' },
    ], formula: '(totalPathLength / feedRate)' },
    { id: 'proc_cncmill_013', name: '3D Surfacing (Scallop)', group: '3D Milling', compatibleMachineTypes: ['CNC Mill'], parameters: [
        { name: 'surfaceArea', label: 'Surface Area to Finish', unit: 'mm²' },
        { name: 'stepover', label: 'Stepover (ae)', unit: 'mm' },
    ], formula: '((surfaceArea / stepover) / feedRate)' },

    // --- HOLE MAKING (Mill & Lathe) ---
    { id: 'proc_hole_001', name: 'Helical Interpolation (Bore)', group: 'Hole Making', compatibleMachineTypes: ['CNC Mill'], parameters: [
        { name: 'boreDepth', label: 'Bore Depth (t)', unit: 'mm' },
        { name: 'boreDiameter', label: 'Bore Diameter (D_path)', unit: 'mm' },
        { name: 'pitch', label: 'Pitch per Revolution (p/ap)', unit: 'mm' },
    ], formula: '(Math.ceil(boreDepth / pitch) * Math.sqrt(Math.pow(Math.PI * (boreDiameter - toolDiameter), 2) + Math.pow(pitch, 2))) / feedRate' },
    { id: 'proc_hole_002', name: 'Thread Milling', group: 'Hole Making', compatibleMachineTypes: ['CNC Mill'], parameters: [
        { name: 'threadDepth', label: 'Thread Depth', unit: 'mm' },
        { name: 'meanDiameter', label: 'Mean Thread Diameter', unit: 'mm' },
        { name: 'pitch', label: 'Thread Pitch', unit: 'mm' },
    ], formula: '((Math.PI * meanDiameter * (threadDepth / pitch)) / feedRate)' },
    { id: 'proc_hole_003', name: 'Drilling (on Mill)', group: 'Hole Making', compatibleMachineTypes: ['CNC Mill'], parameters: [
        { name: 'holeDepth', label: 'Hole Depth', unit: 'mm' },
        { name: 'allowance', label: 'Allowance (for approach)', unit: 'mm' },
        { name: 'numberOfHoles', label: 'Number of Holes', unit: 'count' },
    ], formula: '(((holeDepth + allowance) / feedRate) * numberOfHoles)' },
    { id: 'proc_hole_004', name: 'Boring (Single Point)', group: 'Hole Making', compatibleMachineTypes: ['CNC Mill', 'CNC Lathe'], parameters: [
        { name: 'boreDepth', label: 'Bore Depth', unit: 'mm' },
        { name: 'feedPerRev', label: 'Feed per Revolution', unit: 'mm/rev' }
    ], formula: '(boreDepth / feedRate)' },

    // --- TURNING ---
    { id: 'proc_cnclathe_001', name: 'Turning (OD/ID)', group: 'Turning', compatibleMachineTypes: ['CNC Lathe'], parameters: [
        { name: 'turningLength', label: 'Turning Length', unit: 'mm' },
        { name: 'diameterStart', label: 'Start Diameter', unit: 'mm' },
        { name: 'diameterEnd', label: 'End Diameter', unit: 'mm' },
        { name: 'depthPerPass', label: 'Depth per Pass (ap)', unit: 'mm' },
        { name: 'feedPerRev', label: 'Feed per Revolution', unit: 'mm/rev' },
    ], formula: '(turningLength / feedRate) * Math.ceil(Math.abs(diameterStart - diameterEnd) / 2 / depthPerPass)' },
    { id: 'proc_cnclathe_002', name: 'Facing', group: 'Turning', compatibleMachineTypes: ['CNC Lathe'], parameters: [
        { name: 'facingDiameter', label: 'Facing Diameter', unit: 'mm' },
        { name: 'feedPerRev', label: 'Feed per Revolution', unit: 'mm/rev' },
    ], formula: '((facingDiameter / 2) / feedRate)' },
    { id: 'proc_cnclathe_003', name: 'Grooving', group: 'Turning', compatibleMachineTypes: ['CNC Lathe'], parameters: [
        { name: 'grooveDepth', label: 'Groove Depth', unit: 'mm' },
        { name: 'feedPerRev', label: 'Feed per Revolution', unit: 'mm/rev' },
    ], formula: '(grooveDepth / feedRate)' },
    { id: 'proc_cnclathe_004', name: 'Parting Off', group: 'Turning', compatibleMachineTypes: ['CNC Lathe'], parameters: [
        { name: 'partingDiameter', label: 'Parting Diameter', unit: 'mm' },
        { name: 'feedPerRev', label: 'Feed per Revolution', unit: 'mm/rev' },
    ], formula: '((partingDiameter / 2) / feedRate)' },
    { id: 'proc_cnclathe_005', name: 'Threading (on Lathe)', group: 'Turning', compatibleMachineTypes: ['CNC Lathe'], parameters: [
        { name: 'threadLength', label: 'Thread Length', unit: 'mm' },
        { name: 'pitch', label: 'Thread Pitch', unit: 'mm' },
        { name: 'numberOfPasses', label: 'Number of Passes', unit: 'count' },
    ], formula: '(threadLength / (pitch * spindleSpeed)) * numberOfPasses' },
    { id: 'proc_cnclathe_006', name: 'Drilling (on Lathe)', group: 'Turning', compatibleMachineTypes: ['CNC Lathe'], parameters: [
        { name: 'holeDepth', label: 'Hole Depth', unit: 'mm' },
        { name: 'allowance', label: 'Allowance (for approach)', unit: 'mm' },
        { name: 'numberOfHoles', label: 'Number of Holes', unit: 'count' },
    ], formula: '(((holeDepth + allowance) / feedRate) * numberOfHoles)' },
    
    // --- GRINDING ---
    { id: 'proc_grind_001', name: 'Surface Grinding (Reciprocating)', group: 'Grinding', compatibleMachineTypes: ['Grinder'], parameters: [
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
        const crossfeedPassesNx = Math.ceil((widthW - effectiveWheelWidth) / crossfeedStepFx) + 1;
        const depthPassesNz = Math.ceil(stockToRemoveSr / depthOfCutAp);
        const timePerDoubleStrokeTds = (lengthL + allowance) / tableSpeedVw;
        const cuttingTime = depthPassesNz * crossfeedPassesNx * timePerDoubleStrokeTds;
        const sparkOutTime = sparkOutStrokesNso * timePerDoubleStrokeTds;
        const dressingTimePerPart = partsBetweenDress > 0 ? dressingTime / partsBetweenDress : 0;
        return cuttingTime + sparkOutTime + dressingTimePerPart + handlingTime;
    })()` },
    { id: 'proc_grind_002', name: 'Surface Grinding (Creep-Feed)', group: 'Grinding', compatibleMachineTypes: ['Grinder'], parameters: [
        { name: 'lengthL', label: 'Length', unit: 'mm' },
        { name: 'depthOfCutAp', label: 'Depth of Cut (ap)', unit: 'mm' },
        { name: 'tableSpeedVw', label: 'Table Speed (vw)', unit: 'mm/min' },
        { name: 'allowance', label: 'Over-travel Allowance', unit: 'mm' },
        { name: 'sparkOutTime', label: 'Spark-out Time', unit: 'min' },
        { name: 'handlingTime', label: 'Handling Time', unit: 'min' },
        { name: 'dressingTime', label: 'Dressing Time', unit: 'min' },
        { name: 'partsBetweenDress', label: 'Parts Between Dress', unit: 'count' },
    ], formula: '((lengthL + allowance) / tableSpeedVw) + sparkOutTime + (dressingTime / partsBetweenDress) + handlingTime' },
    { id: 'proc_grind_003', name: 'Cylindrical Grinding (Traverse)', group: 'Grinding', compatibleMachineTypes: ['Grinder', 'CNC Lathe'], parameters: [
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
        const axialPassesNx = Math.ceil((groundLengthL - effectiveWheelWidth) / crossfeedStepFx) + 1;
        const depthPassesNz = Math.ceil(stockToRemoveSr / depthOfCutAp);
        const timePerDoubleStrokeTds = (groundLengthL + allowance) / tableSpeedVw;
        const cuttingTime = depthPassesNz * axialPassesNx * timePerDoubleStrokeTds;
        const sparkOutTime = sparkOutStrokesNso * timePerDoubleStrokeTds;
        const dressingTimePerPart = partsBetweenDress > 0 ? dressingTime / partsBetweenDress : 0;
        return cuttingTime + sparkOutTime + dressingTimePerPart + handlingTime;
    })()` },
    { id: 'proc_grind_004', name: 'Cylindrical Grinding (Plunge)', group: 'Grinding', compatibleMachineTypes: ['Grinder', 'CNC Lathe'], parameters: [
        { name: 'stockToRemoveSr', label: 'Radial Stock to Remove', unit: 'mm' },
        { name: 'infeedRateRin', label: 'Infeed Rate (rin)', unit: 'mm/min' },
        { name: 'sparkOutTime', label: 'Spark-out/Dwell Time', unit: 'min' },
        { name: 'handlingTime', label: 'Handling Time', unit: 'min' },
        { name: 'dressingTime', label: 'Dressing Time', unit: 'min' },
        { name: 'partsBetweenDress', label: 'Parts Between Dress', unit: 'count' },
    ], formula: '(stockToRemoveSr / infeedRateRin) + sparkOutTime + (partsBetweenDress > 0 ? dressingTime / partsBetweenDress : 0) + handlingTime' },
    { id: 'proc_grind_005', name: 'Centerless Grinding (Through-Feed)', group: 'Grinding', compatibleMachineTypes: ['Grinder'], parameters: [
        { name: 'partLengthLp', label: 'Part Length', unit: 'mm' },
        { name: 'axialFeedSpeedVax', label: 'Axial Feed Speed (v_ax)', unit: 'mm/min' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
        { name: 'sparkOutTime', label: 'Spark-out Time', unit: 'min' },
        { name: 'handlingTime', label: 'Handling Time', unit: 'min' },
        { name: 'dressingTime', label: 'Dressing Time', unit: 'min' },
        { name: 'partsBetweenDress', label: 'Parts Between Dress', unit: 'count' },
    ], formula: '((partLengthLp + allowance) / axialFeedSpeedVax) + sparkOutTime + (partsBetweenDress > 0 ? dressingTime / partsBetweenDress : 0) + handlingTime' },
     { id: 'proc_grind_006', name: 'Centerless Grinding (Infeed)', group: 'Grinding', compatibleMachineTypes: ['Grinder'], parameters: [
        { name: 'stockToRemoveSr', label: 'Radial Stock to Remove', unit: 'mm' },
        { name: 'infeedRateRin', label: 'Infeed Rate (rin)', unit: 'mm/min' },
        { name: 'sparkOutTime', label: 'Spark-out/Dwell Time', unit: 'min' },
        { name: 'handlingTime', label: 'Handling Time', unit: 'min' },
        { name: 'dressingTime', label: 'Dressing Time', unit: 'min' },
        { name: 'partsBetweenDress', label: 'Parts Between Dress', unit: 'count' },
    ], formula: '(stockToRemoveSr / infeedRateRin) + sparkOutTime + (partsBetweenDress > 0 ? dressingTime / partsBetweenDress : 0) + handlingTime' },
    { id: 'proc_grind_007', name: 'Thread Grinding', group: 'Grinding', compatibleMachineTypes: ['Grinder'], parameters: [
        { name: 'threadLengthLt', label: 'Thread Length', unit: 'mm' },
        { name: 'pitchP', label: 'Pitch', unit: 'mm' },
        { name: 'numberOfPassesNp', label: 'Number of Passes', unit: 'count' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
        { name: 'sparkOutTime', label: 'Spark-out Time', unit: 'min' },
    ], formula: '(numberOfPassesNp * ((threadLengthLt + allowance) / (pitchP * spindleSpeed))) + sparkOutTime' },

    // --- GEAR CUTTING ---
    { id: 'proc_gear_001', name: 'Gear Hobbing', group: 'Gear Cutting', compatibleMachineTypes: ['Gear Cutter'], parameters: [
        { name: 'faceWidthB', label: 'Face Width', unit: 'mm' },
        { name: 'feedPerRevFa', label: 'Feed per Rev (fa)', unit: 'mm/rev' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
        { name: 'numberOfPasses', label: 'Number of Passes', unit: 'count' },
    ], formula: '(numberOfPasses * (faceWidthB + allowance)) / (feedPerRevFa * spindleSpeed)' },
    { id: 'proc_gear_002', name: 'Gear Shaping', group: 'Gear Cutting', compatibleMachineTypes: ['Gear Cutter'], parameters: [
        { name: 'faceWidthB', label: 'Face Width', unit: 'mm' },
        { name: 'feedPerStrokeFs', label: 'Feed per Stroke (fs)', unit: 'mm/stroke' },
        { name: 'strokesPerMinuteNs', label: 'Strokes per Minute', unit: 'strokes/min' },
        { name: 'numberOfPasses', label: 'Number of Passes', unit: 'count' },
    ], formula: '(numberOfPasses * faceWidthB) / (feedPerStrokeFs * strokesPerMinuteNs)' },
    { id: 'proc_gear_003', name: 'Gear Milling (Form Cutter)', group: 'Gear Cutting', compatibleMachineTypes: ['CNC Mill'], parameters: [
        { name: 'numberOfTeethZ', label: 'Number of Teeth (z)', unit: 'count' },
        { name: 'totalToothDepthH', label: 'Total Tooth Depth (h)', unit: 'mm' },
        { name: 'feedPerRevFn', label: 'Feed per Rev (fn)', unit: 'mm/rev' },
        { name: 'numberOfPasses', label: 'Passes per Tooth', unit: 'count' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
        { name: 'indexingTimePerTooth', label: 'Indexing Time per Tooth', unit: 'min' },
    ], formula: '(numberOfTeethZ * numberOfPasses * ((totalToothDepthH + allowance) / (feedPerRevFn * spindleSpeed))) + (numberOfTeethZ * indexingTimePerTooth)' },
    { id: 'proc_gear_004', name: 'Internal Gear Broaching', group: 'Gear Cutting', compatibleMachineTypes: ['Gear Cutter'], parameters: [
        { name: 'strokeLengthS', label: 'Stroke Length', unit: 'mm' },
        { name: 'strokeSpeedVs', label: 'Stroke Speed (vs)', unit: 'mm/min' },
        { name: 'returnSpeedVr', label: 'Return Speed (vr)', unit: 'mm/min' },
    ], formula: '(strokeLengthS / strokeSpeedVs) + (strokeLengthS / returnSpeedVr)' },
    { id: 'proc_gear_005', name: 'Gear Grinding (Form)', group: 'Gear Cutting', compatibleMachineTypes: ['Grinder', 'Gear Cutter'], parameters: [
        { name: 'totalToothDepthH', label: 'Total Stock to Remove', unit: 'mm' },
        { name: 'radialInfeedRateRin', label: 'Radial Infeed Rate', unit: 'mm/min' },
        { name: 'numberOfPasses', label: 'Number of Passes', unit: 'count' },
        { name: 'sparkOutTime', label: 'Spark-out Time', unit: 'min' },
    ], formula: '((totalToothDepthH / radialInfeedRateRin) * numberOfPasses) + sparkOutTime' },
    { id: 'proc_gear_006', name: 'Gear Shaving (Finishing)', group: 'Gear Cutting', compatibleMachineTypes: ['Gear Cutter'], parameters: [
        { name: 'faceWidthB', label: 'Face Width', unit: 'mm' },
        { name: 'axialFeedFa', label: 'Axial Feed per Rev (fa)', unit: 'mm/rev' },
        { name: 'numberOfStrokesNs', label: 'Number of Strokes', unit: 'count' },
    ], formula: '((faceWidthB / (axialFeedFa * spindleSpeed)) * numberOfStrokesNs)' },

    // --- SAWING ---
    { id: 'proc_saw_001', name: 'Band Saw Cut-Off', group: 'Sawing', compatibleMachineTypes: ['Saw'], parameters: [
        { name: 'cutWidth', label: 'Cut Width/Diameter', unit: 'mm' },
        { name: 'bladeTPI', label: 'Blade TPI', unit: 'TPI' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
    ], formula: '(cutWidth + allowance) / feedRate' },
    { id: 'proc_saw_002', name: 'Circular Saw Cut-Off', group: 'Sawing', compatibleMachineTypes: ['Saw'], parameters: [
        { name: 'cutThickness', label: 'Cut Thickness', unit: 'mm' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
    ], formula: '(cutThickness + allowance) / feedRate' },
    { id: 'proc_saw_003', name: 'Abrasive Cut-Off', group: 'Sawing', compatibleMachineTypes: ['Saw', 'Grinder'], parameters: [
        { name: 'cutThickness', label: 'Cut Thickness', unit: 'mm' },
        { name: 'feedRate', label: 'Feed Rate', unit: 'mm/min' },
        { name: 'allowance', label: 'Approach/Exit Allowance', unit: 'mm' },
    ], formula: '(cutThickness + allowance) / feedRate' },
] as any;


export const TOOL_TYPES = ['End Mill', 'Face Mill', 'Drill', 'Tap', 'Lathe Insert', 'Grooving Tool', 'Grinding Wheel', 'Hob Cutter', 'Shaper Cutter', 'Gear Form Cutter', 'Broach', 'Band Saw Blade', 'Circular Saw Blade'];
export const TOOL_MATERIALS = ['HSS', 'Cobalt', 'Carbide', 'PCD', 'CBN'];
export const ARBOR_OR_INSERT_OPTIONS: Tool['arborOrInsert'][] = ['Shank', 'Arbor', 'Insert'];

// FIX: Cast to `any` to bypass strict type check for seed data missing db-generated columns.
export const DEFAULT_TOOLS_MASTER: Tool[] = [
    // Milling
    { id: 'tool_001', name: 'Sandvik CoroMill Plura 10mm End Mill', brand: 'Sandvik', model: '2P342-1000-PA', toolType: 'End Mill', material: 'Carbide', diameter: 10, cornerRadius: 0.5, numberOfTeeth: 4, arborOrInsert: 'Shank', cuttingSpeedVc: 150, feedPerTooth: 0.06, compatibleMachineTypes: ['CNC Mill'], price: 95, estimatedLife: 50 },
    { id: 'tool_007', name: 'Seco 6mm Ball Nose End Mill', brand: 'Seco Tools', model: 'Jabro-Solid2 JS554', toolType: 'End Mill', material: 'Carbide', diameter: 6, cornerRadius: 3, numberOfTeeth: 4, arborOrInsert: 'Shank', cuttingSpeedVc: 180, feedPerTooth: 0.04, compatibleMachineTypes: ['CNC Mill'], price: 110, estimatedLife: 40 },
    { id: 'tool_004', name: 'Iscar HELIQUMILL 50mm Face Mill', brand: 'Iscar', model: 'HM90 F90A D50-5-22', toolType: 'Face Mill', material: 'Carbide', diameter: 50, cornerRadius: null, numberOfTeeth: 5, arborOrInsert: 'Arbor', cuttingSpeedVc: 200, feedPerTooth: 0.12, compatibleMachineTypes: ['CNC Mill'], price: 280, estimatedLife: 100 },
    
    // Hole Making
    { id: 'tool_002', name: 'Dormer A002 5mm HSS Drill', brand: 'Dormer', model: 'A0025.0', toolType: 'Drill', material: 'HSS', diameter: 5, cornerRadius: null, numberOfTeeth: 2, arborOrInsert: 'Shank', cuttingSpeedVc: 40, feedPerTooth: 0.1, compatibleMachineTypes: ['CNC Mill', 'CNC Lathe'], price: 15, estimatedLife: 200 },
    { id: 'tool_005', name: 'Guhring 10mm Carbide Drill', brand: 'Guhring', model: 'RT 100 U', toolType: 'Drill', material: 'Carbide', diameter: 10, cornerRadius: null, numberOfTeeth: 2, arborOrInsert: 'Shank', cuttingSpeedVc: 100, feedPerTooth: 0.15, compatibleMachineTypes: ['CNC Mill', 'CNC Lathe'], price: 75, estimatedLife: 300 },
    { id: 'tool_006', name: 'Emuge M10x1.5 Tap', brand: 'Emuge', model: 'Rekord B-VA', toolType: 'Tap', material: 'HSS', diameter: 10, cornerRadius: null, numberOfTeeth: 4, arborOrInsert: 'Shank', cuttingSpeedVc: 15, feedPerTooth: null, compatibleMachineTypes: ['CNC Mill'], price: 60, estimatedLife: 500 },

    // Turning
    { id: 'tool_003', name: 'Kennametal CNMG 12.7mm Insert', brand: 'Kennametal', model: 'CNMG120408', toolType: 'Lathe Insert', material: 'Carbide', diameter: 12.7, cornerRadius: 0.8, numberOfTeeth: 1, arborOrInsert: 'Insert', cuttingSpeedVc: 220, feedPerTooth: 0.25, compatibleMachineTypes: ['CNC Lathe'], price: 25, estimatedLife: 10 },
    { id: 'tool_008', name: 'Walter WNMG 12.7mm Insert', brand: 'Walter', model: 'WNMG080408-FP5', toolType: 'Lathe Insert', material: 'Carbide', diameter: 12.7, cornerRadius: 0.8, numberOfTeeth: 1, arborOrInsert: 'Insert', cuttingSpeedVc: 280, feedPerTooth: 0.3, compatibleMachineTypes: ['CNC Lathe'], price: 30, estimatedLife: 15 },
    { id: 'tool_009', name: 'Sandvik 3mm Grooving Insert', brand: 'Sandvik', model: 'CoroCut 2 N123G2', toolType: 'Grooving Tool', material: 'Carbide', diameter: 3, cornerRadius: 0.2, numberOfTeeth: 1, arborOrInsert: 'Insert', cuttingSpeedVc: 150, feedPerTooth: 0.1, compatibleMachineTypes: ['CNC Lathe'], price: 45, estimatedLife: 20 },

    // Grinding
    { id: 'tool_010', name: 'Norton 200mm Grinding Wheel', brand: 'Norton', model: '32A46-H8VBE', toolType: 'Grinding Wheel', material: 'CBN', diameter: 200, cornerRadius: null, numberOfTeeth: null, arborOrInsert: 'Arbor', cuttingSpeedVc: 3000, feedPerTooth: null, compatibleMachineTypes: ['Grinder'], price: 150, estimatedLife: 200 },
    
    // Sawing
    { id: 'tool_011', name: 'Amada SGLB 10 TPI Bandsaw Blade', brand: 'Amada', model: 'SGLB', toolType: 'Band Saw Blade', material: 'HSS', diameter: 27, cornerRadius: null, numberOfTeeth: 10, arborOrInsert: 'Shank', cuttingSpeedVc: 60, feedPerTooth: 0.05, compatibleMachineTypes: ['Saw'], price: 120, estimatedLife: 80 },
] as any;
export const DEFAULT_TOOL_IDS = new Set(DEFAULT_TOOLS_MASTER.map(t => t.id));

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

// FIX: Cast to `any` to bypass strict type check for seed data missing db-generated columns.
// FIX: Set 'unlimited' calculation_limit to -1 to match database schema (number).
// FIX: Updated to snake_case properties and correct `prices` object structure.
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

export const SUPER_ADMIN_EMAILS = ['admin@costinghub.com', 'gokulprasadrs20@gmail.com', 'designersworldcbe@gmail.com'];


// --- START OF NEW SHOWCASE TEMPLATES ---

const CNC_MILL_SHOWCASE: Calculation = {
  id: 'calc_master_mill_v1',
  inputs: {
    id: 'inputs_master_mill', calculationNumber: 'TPL-MILL-01', partNumber: 'HSG-01', partName: 'CNC Mill Showcase', revision: 'A',
    createdAt: new Date().toISOString(), annualVolume: 5000, batchVolume: 200, unitSystem: 'Metric', materialType: 'mat_011',
    rawMaterialProcess: 'Billet', billetShape: 'Block', billetShapeParameters: { length: 120, width: 80, height: 40 },
    rawMaterialWeightKg: 1.04, finishedPartWeightKg: 0.75, materialCostPerKg: 4, materialDensityGcm3: 2.7, transportCostPerKg: 0.3,
    surfaceTreatmentName: 'Anodizing', surfaceTreatmentCostPerKg: 2, laborRatePerHour: 55, overheadRatePercentage: 150, setups: [{
      id: 'setup_mill_1', name: 'Milling Operations', machineId: 'mach_001', timePerSetupMin: 45, toolChangeTimeSec: 10, efficiency: 0.95,
      operations: [
        { id: 'op_m1', processName: 'Face Milling', toolId: 'tool_004', parameters: { faceLength: 120, faceWidth: 80, depthOfCut: 1, radialEngagement: 40 } },
        { id: 'op_m2', processName: 'Pocketing (MRR)', toolId: 'tool_001', parameters: { pocketLength: 50, pocketWidth: 30, pocketDepth: 15, radialEngagement: 5, axialEngagement: 10 } },
        { id: 'op_m3', processName: 'Drilling (on Mill)', toolId: 'tool_005', parameters: { holeDepth: 20, allowance: 2, numberOfHoles: 4 } },
      ]
    }]
  },
  results: { rawMaterialWeightKg: 1.04, finishedPartWeightKg: 0.75, totalMaterialCostPerKg: 6.3, rawMaterialPartCost: 6.55, materialCost: 1310, operationTimeBreakdown: [{ processName: 'Face Milling', timeMin: 0.43, id: 'op_m1' }, { processName: 'Pocketing (MRR)', timeMin: 1.1, id: 'op_m2' }, { processName: 'Drilling (on Mill)', timeMin: 0.58, id: 'op_m3' }], totalCuttingTimeMin: 2.11, totalSetupTimeMin: 47.37, totalToolChangeTimeMin: 0.53, cycleTimePerPartMin: 0.25, totalMachineTimeHours: 0.83, machineCost: 62.5, laborCost: 45.88, overheadCost: 2127.56, totalCost: 3545.94, costPerPart: 17.73 },
  status: 'final', user_id: 'system-default', created_at: '2024-01-01T00:00:00.000Z',
};

const CNC_LATHE_SHOWCASE: Calculation = {
  id: 'calc_master_lathe_v1',
  inputs: {
    id: 'inputs_master_lathe', calculationNumber: 'TPL-LATHE-01', partNumber: 'FLG-01', partName: 'CNC Lathe Showcase', revision: 'A',
    createdAt: new Date().toISOString(), annualVolume: 10000, batchVolume: 500, unitSystem: 'Metric', materialType: 'mat_005',
    rawMaterialProcess: 'Billet', billetShape: 'Cylinder', billetShapeParameters: { diameter: 80, height: 40 },
    rawMaterialWeightKg: 1.61, finishedPartWeightKg: 1.2, materialCostPerKg: 4.5, materialDensityGcm3: 8, transportCostPerKg: 0.2,
    surfaceTreatmentName: 'Passivation', surfaceTreatmentCostPerKg: 1, laborRatePerHour: 60, overheadRatePercentage: 160, setups: [{
      id: 'setup_lathe_1', name: 'Turning Operations', machineId: 'mach_002', timePerSetupMin: 60, toolChangeTimeSec: 15, efficiency: 0.90,
      operations: [
        { id: 'op_l1', processName: 'Facing', toolId: 'tool_003', parameters: { facingDiameter: 80, feedPerRev: 0.2 } },
        { id: 'op_l2', processName: 'Turning (OD/ID)', toolId: 'tool_003', parameters: { turningLength: 35, diameterStart: 80, diameterEnd: 70, depthPerPass: 1, feedPerRev: 0.25 } },
        { id: 'op_l3', processName: 'Grooving', toolId: 'tool_009', parameters: { grooveDepth: 5, feedPerRev: 0.1 } },
      ]
    }]
  },
  results: { rawMaterialWeightKg: 1.61, finishedPartWeightKg: 1.2, totalMaterialCostPerKg: 5.7, rawMaterialPartCost: 9.18, materialCost: 4588.5, operationTimeBreakdown: [{ processName: 'Facing', timeMin: 0.21, id: 'op_l1' }, { processName: 'Turning (OD/ID)', timeMin: 0.21, id: 'op_l2' }, { processName: 'Grooving', timeMin: 0.07, id: 'op_l3' }], totalCuttingTimeMin: 0.49, totalSetupTimeMin: 66.67, totalToolChangeTimeMin: 0.83, cycleTimePerPartMin: 0.14, totalMachineTimeHours: 1.13, machineCost: 102, laborCost: 67.8, overheadCost: 7614.88, totalCost: 12373.18, costPerPart: 24.75 },
  status: 'final', user_id: 'system-default', created_at: '2024-01-01T00:00:00.000Z',
};

const SAW_SHOWCASE: Calculation = {
  id: 'calc_master_saw_v1',
  inputs: {
    id: 'inputs_master_saw', calculationNumber: 'TPL-SAW-01', partNumber: 'BLK-01', partName: 'Saw Cut-Off Showcase', revision: 'A',
    createdAt: new Date().toISOString(), annualVolume: 20000, batchVolume: 1000, unitSystem: 'Metric', materialType: 'mat_001',
    rawMaterialProcess: 'Billet', billetShape: 'Bar', billetShapeParameters: { length: 1000, width: 50, height: 50 },
    rawMaterialWeightKg: 19.68, finishedPartWeightKg: 0.98, materialCostPerKg: 1.5, materialDensityGcm3: 7.87, transportCostPerKg: 0.1,
    surfaceTreatmentName: 'None', surfaceTreatmentCostPerKg: 0, laborRatePerHour: 40, overheadRatePercentage: 120, setups: [{
      id: 'setup_saw_1', name: 'Sawing Operation', machineId: 'mach_003', timePerSetupMin: 15, toolChangeTimeSec: 0, efficiency: 1,
      operations: [{ id: 'op_s1', processName: 'Band Saw Cut-Off', toolId: 'tool_011', parameters: { cutWidth: 50, bladeTPI: 10, allowance: 5 } }]
    }]
  },
  results: { rawMaterialWeightKg: 0.98, finishedPartWeightKg: 0.98, totalMaterialCostPerKg: 1.6, rawMaterialPartCost: 1.57, materialCost: 1570, operationTimeBreakdown: [{ processName: 'Band Saw Cut-Off', timeMin: 0.34, id: 'op_s1' }], totalCuttingTimeMin: 0.34, totalSetupTimeMin: 15, totalToolChangeTimeMin: 0, cycleTimePerPartMin: 0.02, totalMachineTimeHours: 0.26, machineCost: 10.23, laborCost: 10.23, overheadCost: 1913.3, totalCost: 3503.76, costPerPart: 3.5 },
  status: 'final', user_id: 'system-default', created_at: '2024-01-01T00:00:00.000Z',
};

const GEAR_CUTTER_SHOWCASE: Calculation = {
  id: 'calc_master_gear_v1',
  inputs: {
    id: 'inputs_master_gear', calculationNumber: 'TPL-GEAR-01', partNumber: 'GEAR-01', partName: 'Gear Hobbing Showcase', revision: 'A',
    createdAt: new Date().toISOString(), annualVolume: 2000, batchVolume: 100, unitSystem: 'Metric', materialType: 'mat_003',
    rawMaterialProcess: 'Forging', billetShape: undefined, billetShapeParameters: undefined,
    rawMaterialWeightKg: 2.5, finishedPartWeightKg: 2.1, materialCostPerKg: 3.5, materialDensityGcm3: 7.85, transportCostPerKg: 0.2,
    surfaceTreatmentName: 'Carburizing', surfaceTreatmentCostPerKg: 3, laborRatePerHour: 70, overheadRatePercentage: 200, setups: [{
      id: 'setup_gear_1', name: 'Gear Hobbing', machineId: 'mach_009', timePerSetupMin: 90, toolChangeTimeSec: 120, efficiency: 0.85,
      operations: [{ id: 'op_g1', processName: 'Gear Hobbing', toolId: 'tool_001', parameters: { faceWidthB: 40, feedPerRevFa: 1.5, allowance: 10, numberOfPasses: 1 } }]
    }]
  },
  results: { rawMaterialWeightKg: 2.5, finishedPartWeightKg: 2.1, totalMaterialCostPerKg: 6.7, rawMaterialPartCost: 16.75, materialCost: 1675, operationTimeBreakdown: [{ processName: 'Gear Hobbing', timeMin: 1.47, id: 'op_g1' }], totalCuttingTimeMin: 1.47, totalSetupTimeMin: 105.88, totalToolChangeTimeMin: 2.35, cycleTimePerPartMin: 1.1, totalMachineTimeHours: 1.83, machineCost: 237.53, laborCost: 127.88, overheadCost: 4080.82, totalCost: 6121.23, costPerPart: 61.21 },
  status: 'final', user_id: 'system-default', created_at: '2024-01-01T00:00:00.000Z',
};

const GRINDER_SHOWCASE: Calculation = {
  id: 'calc_master_grinder_v1',
  inputs: {
    id: 'inputs_master_grinder', calculationNumber: 'TPL-GRIND-01', partNumber: 'PIN-01', partName: 'Surface Grinding Showcase', revision: 'A',
    createdAt: new Date().toISOString(), annualVolume: 15000, batchVolume: 1000, unitSystem: 'Metric', materialType: 'mat_016',
    rawMaterialProcess: 'Billet', billetShape: 'Block', billetShapeParameters: { length: 60, width: 60, height: 25 },
    rawMaterialWeightKg: 0.71, finishedPartWeightKg: 0.7, materialCostPerKg: 3.5, materialDensityGcm3: 7.85, transportCostPerKg: 0.2,
    surfaceTreatmentName: 'None', surfaceTreatmentCostPerKg: 0, laborRatePerHour: 65, overheadRatePercentage: 180, setups: [{
      id: 'setup_grinder_1', name: 'Grinding Operation', machineId: 'mach_008', timePerSetupMin: 30, toolChangeTimeSec: 0, efficiency: 0.98,
      operations: [{ id: 'op_gr1', processName: 'Surface Grinding (Reciprocating)', toolId: 'tool_010', parameters: { lengthL: 60, widthW: 60, stockToRemoveSr: 0.1, depthOfCutAp: 0.01, tableSpeedVw: 6000, overlapRatioU: 0.3, sparkOutStrokesNso: 3, allowance: 10, handlingTime: 0.2, dressingTime: 2, partsBetweenDress: 100 } }]
    }]
  },
  results: { rawMaterialWeightKg: 0.71, finishedPartWeightKg: 0.7, totalMaterialCostPerKg: 3.7, rawMaterialPartCost: 2.63, materialCost: 2627, operationTimeBreakdown: [{ processName: 'Surface Grinding (Reciprocating)', timeMin: 0.62, id: 'op_gr1' }], totalCuttingTimeMin: 0.62, totalSetupTimeMin: 30.61, totalToolChangeTimeMin: 0, cycleTimePerPartMin: 0.03, totalMachineTimeHours: 0.52, machineCost: 33.82, laborCost: 33.82, overheadCost: 4851.91, totalCost: 7546.54, costPerPart: 7.55 },
  status: 'final', user_id: 'system-default', created_at: '2024-01-01T00:00:00.000Z',
};


export const DEFAULT_CALCULATIONS_SHOWCASE: Calculation[] = [
  CNC_MILL_SHOWCASE,
  CNC_LATHE_SHOWCASE,
  SAW_SHOWCASE,
  GEAR_CUTTER_SHOWCASE,
  GRINDER_SHOWCASE,
];

export const DEFAULT_CALCULATION_IDS = new Set(DEFAULT_CALCULATIONS_SHOWCASE.map(c => c.id));
