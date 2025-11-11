

import type { MachiningInput, MachiningResult, Operation, Machine, Setup, BilletShapeParameters, Process, Tool, MarkupCosts, RegionCost, MaterialProperty } from '../types';
import { CURRENCY_CONVERSION_RATES_TO_USD } from '../constants';

const getConvertedPrice = (
  itemId: string,
  itemType: 'material' | 'machine' | 'tool',
  region: string,
  regionCosts: RegionCost[],
  fallbackPrice: number,
  // The fallback price from the library is assumed to be in USD
  targetCurrency: string 
): number => {
  const now = new Date();

  // Helper to find the latest valid RegionCost object for a given region
  const getRegionCost = (targetRegion: string): RegionCost | null => {
    const regionSpecificCosts = regionCosts
      .filter(rc => 
        rc.item_id === itemId && 
        rc.item_type === itemType && 
        rc.region === targetRegion &&
        new Date(rc.valid_from) <= now
      )
      .sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime());
    
    return regionSpecificCosts.length > 0 ? regionSpecificCosts[0] : null;
  };

  // Find the cost entry, with fallback to 'Default'
  const costEntry = getRegionCost(region) ?? (region !== 'Default' ? getRegionCost('Default') : null);

  const price = costEntry ? costEntry.price : fallbackPrice;
  const fromCurrency = costEntry ? costEntry.currency : 'USD'; // Assume fallback is USD

  // Conversion logic
  const fromRate = CURRENCY_CONVERSION_RATES_TO_USD[fromCurrency] || 1;
  const toRate = CURRENCY_CONVERSION_RATES_TO_USD[targetCurrency] || 1;

  if (fromCurrency === targetCurrency) {
    return price;
  }
  
  // Convert price to USD first, then to target currency
  const priceInUsd = price * fromRate;
  const convertedPrice = priceInUsd / toRate;
  
  return convertedPrice;
};


export const calculateBilletWeight = (
  shape: string,
  params: BilletShapeParameters,
  densityGcm3: number
): number => {
  if (!params || densityGcm3 <= 0) {
    return 0;
  }

  let volumeCm3 = 0;
  const toCm = (val?: number) => (val || 0) / 10; // Convert mm to cm

  try {
    switch (shape) {
      case 'Block':
      case 'Plate':
      case 'Bar': {
        const l = toCm(params.length);
        const w = toCm(params.width);
        const h = toCm(params.height);
        if (l > 0 && w > 0 && h > 0) volumeCm3 = l * w * h;
        break;
      }
      case 'Cylinder':
      case 'Rod': {
        const r = toCm(params.diameter) / 2;
        const h = toCm(params.height);
        if (r > 0 && h > 0) volumeCm3 = Math.PI * r * r * h;
        break;
      }
      case 'Tube': {
        const R = toCm(params.outerDiameter) / 2;
        const r = toCm(params.innerDiameter) / 2;
        const h = toCm(params.height);
        if (R > 0 && h > 0 && r >= 0 && R > r) {
          volumeCm3 = Math.PI * (R * R - r * r) * h;
        }
        break;
      }
      case 'Cube': {
        const s = toCm(params.side);
        if (s > 0) volumeCm3 = s * s * s;
        break;
      }
      case 'Rectangle Tube': {
        const L = toCm(params.outerWidth);
        const W = toCm(params.outerHeight);
        const h = toCm(params.length);
        const t = toCm(params.wallThickness);

        if (L > 0 && W > 0 && h > 0 && t > 0 && t * 2 < L && t * 2 < W) {
          const innerL = L - 2 * t;
          const innerW = W - 2 * t;
          volumeCm3 = (L * W - innerL * innerW) * h;
        }
        break;
      }
      default:
        volumeCm3 = 0;
    }
  } catch (e) {
    console.error(`Error calculating volume for shape ${shape}:`, e);
    return 0;
  }
  
  if (volumeCm3 <= 0 || !isFinite(volumeCm3)) {
      return 0;
  }

  const weightGrams = volumeCm3 * densityGcm3;
  const weightKg = weightGrams / 1000;
  
  return parseFloat(weightKg.toFixed(4));
};

export const calculateOperationTime = (operation: Operation, process: Process, tool: Tool | null): number => {
  if (!process?.formula) {
    return 0;
  }

  const executionParams: { [key: string]: number } = { ...operation.parameters };

  // 1. Initialize calculated values
  let spindleSpeed = 0;
  let feedRate = 0;

  // 2. Get tool properties, allowing overrides from operation.parameters
  const cuttingSpeed = operation.parameters.cuttingSpeed ?? tool?.cuttingSpeedVc ?? 0;
  const toolDiameter = tool?.diameter ?? 0;
  
  // 3. Differentiate between process groups for accurate speed/feed calculations
  if (process.group === 'Turning') {
    // --- TURNING LOGIC ---
    // For lathe tools, 'feedPerTooth' is used to store feedPerRev.
    const feedPerRev = operation.parameters.feedPerRev ?? tool?.feedPerTooth ?? 0;
    
    // For turning, RPM is based on workpiece diameter, not tool diameter (except for drilling)
    const workpieceDiameter = 
      process.name === 'Drilling (on Lathe)' ? toolDiameter :
      (operation.parameters.diameterStart ?? operation.parameters.facingDiameter ?? operation.parameters.partingDiameter ?? toolDiameter);

    if (workpieceDiameter > 0 && cuttingSpeed > 0) {
      spindleSpeed = (cuttingSpeed * 1000) / (Math.PI * workpieceDiameter);
    }
    if (spindleSpeed > 0 && feedPerRev > 0) {
      feedRate = spindleSpeed * feedPerRev;
    }
    
    // Add calculated values to execution context for the formula
    executionParams.feedPerRev = feedPerRev;

  } else if (process.group === 'Sawing') {
    // --- SAWING LOGIC ---
    const feedPerTooth = operation.parameters.feedPerTooth ?? tool?.feedPerTooth ?? 0;

    if (process.name === 'Band Saw Cut-Off') {
        const bladeTPI = operation.parameters.bladeTPI ?? 0;
        if (feedPerTooth > 0 && bladeTPI > 0 && cuttingSpeed > 0) {
            // Formula from user spec: vf = ft * (TPI * 25.4) * Nb
            feedRate = feedPerTooth * (bladeTPI * 25.4) * cuttingSpeed;
        }
    } else if (process.name === 'Circular Saw Cut-Off') {
        const numberOfTeeth = operation.parameters.numberOfTeeth ?? tool?.numberOfTeeth ?? 1;
        if (toolDiameter > 0 && cuttingSpeed > 0) {
            spindleSpeed = (cuttingSpeed * 1000) / (Math.PI * toolDiameter);
        }
        if (spindleSpeed > 0 && feedPerTooth > 0 && numberOfTeeth > 0) {
            feedRate = spindleSpeed * feedPerTooth * numberOfTeeth;
        }
    } else if (process.name === 'Abrasive Cut-Off') {
        // Feed rate is a direct input for this process
        feedRate = operation.parameters.feedRate ?? 0;
    }
  } else {
    // --- MILLING/OTHER LOGIC ---
    const feedPerTooth = operation.parameters.feedPerTooth ?? tool?.feedPerTooth ?? 0;
    const numberOfTeeth = operation.parameters.numberOfTeeth ?? tool?.numberOfTeeth ?? 1;

    if (toolDiameter > 0 && cuttingSpeed > 0) {
      spindleSpeed = (cuttingSpeed * 1000) / (Math.PI * toolDiameter);
    }
    if (spindleSpeed > 0 && feedPerTooth > 0 && numberOfTeeth > 0) {
      feedRate = spindleSpeed * feedPerTooth * numberOfTeeth;
    }
    
    // Add values to execution context
    executionParams.feedPerTooth = feedPerTooth;
    executionParams.numberOfTeeth = numberOfTeeth;
  }

  // Make common calculated and tool values available to all formulas
  executionParams.spindleSpeed = spindleSpeed;
  executionParams.feedRate = feedRate || 1; // Fallback to 1 to avoid division by zero
  executionParams.toolDiameter = toolDiameter;

  const allParamNames = Object.keys(executionParams);
  const paramValues = allParamNames.map(name => executionParams[name]);
  
  try {
    // Create a function with all available parameters in its scope
    const formulaFn = new Function(...allParamNames, 'Math', `return ${process.formula}`);
    const result = formulaFn(...paramValues, Math);
    
    // Check for invalid results (NaN, Infinity, negative time)
    if (typeof result !== 'number' || !isFinite(result) || result < 0) {
      console.warn(`Invalid result from formula for process "${process.name}":`, result);
      return 0;
    }
    
    return result;
  } catch (e) {
    console.error(`Error executing formula for process "${process.name}":`, e);
    console.error(`Formula:`, process.formula);
    console.error(`Parameters:`, executionParams);
    return 0;
  }
};

export const calculateMachiningCosts = (inputs: MachiningInput, machines: Machine[], processes: Process[], tools: Tool[], regionCosts: RegionCost[]): MachiningResult => {
  const {
    batchVolume,
    transportCostPerKg,
    heatTreatmentCostPerKg,
    surfaceTreatments,
    setups,
    markups,
    rawMaterialWeightKg,
    finishedPartWeightKg,
    partSurfaceAreaM2,
    region,
    materialType,
  } = inputs;

  const targetCurrency = inputs.currency || 'USD';

  // 1. Material Cost Calculation
  const materialCostPerKg = getConvertedPrice(materialType, 'material', region, regionCosts, inputs.materialCostPerKg, targetCurrency);

  const totalMaterialCostPerKg = materialCostPerKg + (transportCostPerKg || 0) + (heatTreatmentCostPerKg || 0);
  const rawMaterialPartCost = rawMaterialWeightKg * totalMaterialCostPerKg;
  const materialCost = rawMaterialPartCost * batchVolume;

  // 2. Surface Treatment Cost
  const surfaceTreatmentCostPerPart = (surfaceTreatments || []).reduce((total, treatment) => {
      if (treatment.unit === 'per_kg') {
          const weightToUse = treatment.based_on === 'raw_weight' ? rawMaterialWeightKg : finishedPartWeightKg;
          return total + (treatment.cost * weightToUse);
      }
      if (treatment.unit === 'per_area') {
          return total + (treatment.cost * partSurfaceAreaM2);
      }
      return total;
  }, 0);
  const surfaceTreatmentCost = surfaceTreatmentCostPerPart * batchVolume;


  // 3. Time and Machining Cost Calculation
  let totalCuttingTimeMin = 0;
  let totalSetupTimeMin = 0;
  let totalToolChangeTimeMin = 0;
  let totalMachiningCostForBatch = 0;
  let totalToolCostForBatch = 0;
  const operationTimeBreakdown: { processName: string; timeMin: number; id: string; machineName?: string }[] = [];

  setups.forEach(setup => {
      const machine = machines.find(m => m.id === setup.machineId);
      const efficiencyDivisor = (setup.efficiency > 0 && setup.efficiency <= 1) ? setup.efficiency : 1;

      let timeOnThisMachineMin = 0;
      
      const effectiveSetupTime = (setup.timePerSetupMin || 0) / efficiencyDivisor;
      totalSetupTimeMin += effectiveSetupTime;
      timeOnThisMachineMin += effectiveSetupTime;
      
      const effectiveToolChangeTime = (setup.operations.length * ((setup.toolChangeTimeSec || 0) / 60)) / efficiencyDivisor;
      totalToolChangeTimeMin += effectiveToolChangeTime;
      timeOnThisMachineMin += effectiveToolChangeTime;

      setup.operations.forEach(op => {
          const processDef = processes.find(p => p.name === op.processName);
          const tool = op.toolId ? tools.find(t => t.id === op.toolId) : null;
          const rawOpTimeMin = processDef ? calculateOperationTime(op, processDef, tool) : 0;
          const effectiveOpTimeMin = rawOpTimeMin / efficiencyDivisor;
          
          if (tool && tool.price != null && tool.price > 0 && tool.estimatedLife != null && tool.estimatedLife > 0) {
            const regionalToolPrice = getConvertedPrice(tool.id, 'tool', region, regionCosts, tool.price, targetCurrency);
            const toolLifeMinutes = tool.estimatedLife * 60;
            if (toolLifeMinutes > 0) {
              const opToolCostForBatch = (effectiveOpTimeMin * batchVolume / toolLifeMinutes) * regionalToolPrice;
              totalToolCostForBatch += opToolCostForBatch;
            }
          }

          operationTimeBreakdown.push({
              processName: op.processName,
              timeMin: effectiveOpTimeMin,
              id: op.id,
              machineName: machine?.name,
          });
          totalCuttingTimeMin += effectiveOpTimeMin;
          timeOnThisMachineMin += effectiveOpTimeMin;
      });
      
      if (machine) {
        const machineHourlyRate = getConvertedPrice(machine.id, 'machine', region, regionCosts, machine.hourlyRate, targetCurrency);
        totalMachiningCostForBatch += (timeOnThisMachineMin / 60) * machineHourlyRate;
      }
  });

  const totalMachineTimeMinutes = totalCuttingTimeMin + totalSetupTimeMin + totalToolChangeTimeMin;
  const totalMachineTimeHours = totalMachineTimeMinutes / 60;
  const cycleTimePerPartMin = batchVolume > 0 ? totalMachineTimeMinutes / batchVolume : 0;
  
  const machiningCostPerPart = batchVolume > 0 ? totalMachiningCostForBatch / batchVolume : 0;
  const toolCostPerPart = batchVolume > 0 ? totalToolCostForBatch / batchVolume : 0;
  
  // 4. Markup Calculation
  const baseCost1 = rawMaterialPartCost + machiningCostPerPart + toolCostPerPart;
  const baseCost2 = baseCost1 + surfaceTreatmentCostPerPart;
  
  const markupCostsPerPart: MarkupCosts = {
    general: baseCost1 * ((markups.general || 0) / 100),
    admin: baseCost1 * ((markups.admin || 0) / 100),
    sales: baseCost1 * ((markups.sales || 0) / 100),
    miscellaneous: baseCost1 * ((markups.miscellaneous || 0) / 100),
    packing: baseCost2 * ((markups.packing || 0) / 100),
    transport: baseCost2 * ((markups.transport || 0) / 100),
    profit: baseCost2 * ((markups.profit || 0) / 100),
    duty: baseCost2 * ((markups.duty || 0) / 100),
  };
  
  const totalMarkupCostPerPart = Object.values(markupCostsPerPart).reduce((sum, cost) => sum + cost, 0);

  // 5. Final Cost Calculation
  const costPerPart = baseCost1 + surfaceTreatmentCostPerPart + totalMarkupCostPerPart;
  const totalCost = costPerPart * batchVolume;

  const markupCostsForBatch: MarkupCosts = Object.keys(markupCostsPerPart).reduce((acc, key) => {
    (acc as any)[key] = (markupCostsPerPart as any)[key] * batchVolume;
    return acc;
  }, {} as MarkupCosts);

  const results: MachiningResult = {
    rawMaterialWeightKg,
    finishedPartWeightKg,
    totalMaterialCostPerKg,
    rawMaterialPartCost,
    materialCost,
    surfaceTreatmentCost,
    operationTimeBreakdown,
    totalCuttingTimeMin,
    totalSetupTimeMin,
    totalToolChangeTimeMin,
    cycleTimePerPartMin,
    totalMachineTimeHours,
    machiningCost: totalMachiningCostForBatch,
    toolCost: totalToolCostForBatch,
    markupCosts: markupCostsForBatch,
    totalCost,
    costPerPart,
  };

  return results;
};