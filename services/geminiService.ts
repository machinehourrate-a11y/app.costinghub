
import { GoogleGenAI, Type } from "@google/genai";
import type { GeminiSuggestion, GeminiToolSuggestion, GeminiProcessSuggestion, GeminiMachineSuggestion, MaterialMasterItem, Machine, Process, Tool } from '../types';
import { TOOL_TYPES, TOOL_MATERIALS, ARBOR_OR_INSERT_OPTIONS, MACHINE_TYPES, ADDITIONAL_AXIS_OPTIONS } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Cleans and parses a JSON string that might be wrapped in markdown code fences.
 * @param text The raw text response from the API.
 * @returns The parsed JSON object.
 */
const cleanAndParseJson = (text: string): any => {
  // Attempt to remove markdown code fences (```json ... ```) and trim whitespace.
  const cleanedText = text.replace(/^```json\s*|```\s*$/g, '').trim();
  try {
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Failed to parse cleaned JSON, will try original text:", cleanedText, error);
    // As a fallback, try to parse the original text in case it's valid JSON without fences.
    try {
        return JSON.parse(text);
    } catch (fallbackError) {
        console.error("Failed to parse original JSON as well:", text, fallbackError);
        // Re-throw the original parsing error to be handled by the caller.
        throw error; 
    }
  }
};


const materialResponseSchema = {
    type: Type.OBJECT,
    properties: {
        name: {
            type: Type.STRING,
            description: "The common industry name for the material, e.g., 'Aluminum 6061-T6'."
        },
        category: {
            type: Type.STRING,
            description: "The material's category based on ISO 5167. Use one of the provided enum values.",
            enum: ["P - Steel", "M - Stainless Steel", "K - Cast Iron", "N - Non-ferrous", "S - Superalloys & Titanium", "H - Hardened Steel", "O - Polymers", "SO - Special Alloys", "Other"]
        },
        subCategory: {
            type: Type.STRING,
            description: "A specific sub-category for the material, e.g., 'Low Carbon Steel' or 'Austenitic'."
        },
        properties: {
            type: Type.OBJECT,
            description: "An object containing key-value pairs of the material's physical and mechanical properties.",
            properties: {
                "Density": {
                    type: Type.OBJECT,
                    properties: {
                        value: { type: Type.NUMBER, description: "The density value." },
                        unit: { type: Type.STRING, description: "The unit of measurement, must be 'g/cm³'." }
                    }
                },
                "Cost Per Kg": {
                    type: Type.OBJECT,
                    properties: {
                        value: { type: Type.NUMBER, description: "The estimated cost per kilogram." },
                        unit: { type: Type.STRING, description: "The currency symbol." }
                    }
                },
                "Tensile Strength, Ultimate": {
                    type: Type.OBJECT,
                    properties: {
                        value: { type: Type.NUMBER, description: "The ultimate tensile strength value." },
                        unit: { type: Type.STRING, description: "The unit of measurement, must be 'MPa'." }
                    }
                },
                "Modulus of Elasticity": {
                    type: Type.OBJECT,
                    properties: {
                        value: { type: Type.NUMBER, description: "The modulus of elasticity value." },
                        unit: { type: Type.STRING, description: "The unit of measurement, must be 'GPa'." }
                    }
                },
                "Thermal Conductivity": {
                    type: Type.OBJECT,
                    properties: {
                        value: { type: Type.NUMBER, description: "The thermal conductivity value." },
                        unit: { type: Type.STRING, description: "The unit of measurement, must be 'W/m-K'." }
                    }
                },
                 "Max Service Temperature, Air": {
                    type: Type.OBJECT,
                    properties: {
                        value: { type: Type.NUMBER, description: "The maximum continuous service temperature in air." },
                        unit: { type: Type.STRING, description: "The unit of measurement, must be '°C'." }
                    }
                },
                "Elongation at Break": {
                    type: Type.OBJECT,
                    properties: {
                        value: { type: Type.NUMBER, description: "The elongation at break percentage." },
                        unit: { type: Type.STRING, description: "The unit of measurement, must be '%'." }
                    }
                },
                "Hardness, Brinell": {
                    type: Type.OBJECT,
                    properties: {
                        value: { type: Type.STRING, description: "The Brinell hardness value (e.g., '187 HB')." },
                        unit: { type: Type.STRING, description: "The unit of measurement (leave empty)." }
                    }
                },
                "Hardness, Rockwell C": {
                    type: Type.OBJECT,
                    properties: {
                        value: { type: Type.STRING, description: "The Rockwell C hardness value (e.g., '62 HRC')." },
                        unit: { type: Type.STRING, description: "The unit of measurement (leave empty)." }
                    }
                },
                "Hardness, Rockwell R": {
                    type: Type.OBJECT,
                    properties: {
                        value: { type: Type.STRING, description: "The Rockwell R hardness value." },
                        unit: { type: Type.STRING, description: "The unit of measurement (leave empty)." }
                    }
                }
            }
        }
    },
    required: ["name", "category", "properties"]
};

export const suggestMaterial = async (prompt: string, currency: string): Promise<GeminiSuggestion | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on the following description, provide a detailed material profile. The currency for 'Cost Per Kg' must be ${currency}. Description: "${prompt}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: materialResponseSchema,
            },
        });
        
        const suggestedData = cleanAndParseJson(response.text) as GeminiSuggestion;
        
        if (suggestedData.properties['Cost Per Kg']) {
            suggestedData.properties['Cost Per Kg'].unit = currency;
        }

        return suggestedData;
    } catch (error) {
        console.error("Error calling Gemini API for material suggestion:", error);
        return null;
    }
};

export const suggestMultipleMaterials = async (prompt: string, currency: string): Promise<Omit<MaterialMasterItem, 'id' | 'user_id' | 'created_at'>[] | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Based on the following request, provide a list of detailed material profiles. The currency for 'Cost Per Kg' must be ${currency}. Request: "${prompt}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: materialResponseSchema },
            },
        });
        
        const suggestedData = cleanAndParseJson(response.text) as GeminiSuggestion[];
        suggestedData.forEach(material => {
            if (material.properties['Cost Per Kg']) {
                material.properties['Cost Per Kg'].unit = currency;
            }
        });
        return suggestedData;
    } catch (error) {
        console.error("Error calling Gemini API for multiple material suggestion:", error);
        return null;
    }
};

const toolResponseSchema = {
    type: Type.OBJECT,
    properties: {
        brand: { type: Type.STRING, description: "The brand or manufacturer of the tool." },
        model: { type: Type.STRING, description: "The model name or number of the tool." },
        toolType: { type: Type.STRING, enum: TOOL_TYPES },
        material: { type: Type.STRING, enum: TOOL_MATERIALS },
        diameter: { type: Type.NUMBER, description: "Tool diameter in mm." },
        cornerRadius: { type: Type.NUMBER, description: "Corner radius in mm. Use null if not applicable (e.g., for a drill)." },
        numberOfTeeth: { type: Type.NUMBER, description: "Number of cutting teeth/flutes. Use null if not applicable." },
        arborOrInsert: { type: Type.STRING, enum: ARBOR_OR_INSERT_OPTIONS },
        compatibleMachineTypes: { type: Type.ARRAY, items: { type: Type.STRING, enum: MACHINE_TYPES } },
        cuttingSpeedVc: { type: Type.NUMBER, description: "Recommended cutting speed (Vc) in m/min for a common workpiece material like mild steel or aluminum. Null if not applicable." },
        feedPerTooth: { type: Type.NUMBER, description: "Recommended feed per tooth in mm for a common workpiece material. Null if not applicable." },
        estimatedLife: { type: Type.NUMBER, description: "Estimated tool life in hours under normal usage. Null if unknown." },
        price: { type: Type.NUMBER, description: "Estimated price of the tool in a standard currency like USD. Null if unknown." },
    },
    required: ["brand", "model", "toolType", "material", "diameter", "arborOrInsert", "compatibleMachineTypes"]
};

export const suggestTool = async (prompt: string): Promise<GeminiToolSuggestion | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on the following description, provide a detailed tool profile including brand, model, price, and estimated life. Infer typical cutting parameters for a common material if not specified. Description: "${prompt}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: toolResponseSchema,
            },
        });
        const suggestion = cleanAndParseJson(response.text) as GeminiToolSuggestion;
        
        if (suggestion.numberOfTeeth != null) {
            suggestion.numberOfTeeth = Math.round(suggestion.numberOfTeeth);
        }
        if (suggestion.estimatedLife != null) {
            suggestion.estimatedLife = Math.round(suggestion.estimatedLife);
        }

        return suggestion;
    } catch (error) {
        console.error("Error calling Gemini API for tool suggestion:", error);
        return null;
    }
};

export const suggestMultipleTools = async (prompt: string): Promise<Omit<Tool, 'id' | 'user_id' | 'created_at'>[] | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Based on the following request, provide a list of detailed tool profiles including brand, model, price, and estimated life. Infer typical cutting parameters for a common material if not specified. Description: "${prompt}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: toolResponseSchema },
            },
        });
        const suggestions = cleanAndParseJson(response.text) as GeminiToolSuggestion[];

        return suggestions.map(s => {
            const name = `${s.brand} ${s.model} ${s.diameter || ''}mm ${s.toolType}`.trim().replace(/\s+/g, ' ');
            let speedRpm: number | null = null;
            let feedRate: number | null = null;

            if (s.numberOfTeeth != null) {
                s.numberOfTeeth = Math.round(s.numberOfTeeth);
            }
            if (s.estimatedLife != null) {
                s.estimatedLife = Math.round(s.estimatedLife);
            }

            if (s.cuttingSpeedVc && s.diameter > 0) {
                speedRpm = Math.round((s.cuttingSpeedVc * 1000) / (Math.PI * s.diameter));
            }
            if (speedRpm && s.feedPerTooth && s.numberOfTeeth) {
                feedRate = Math.round(speedRpm * s.feedPerTooth * s.numberOfTeeth);
            }
            return { ...s, name, speedRpm, feedRate };
        });
    } catch (error) {
        console.error("Error calling Gemini API for multiple tool suggestion:", error);
        return null;
    }
};

const toolLifeResponseSchema = {
    type: Type.OBJECT,
    properties: {
        estimatedLife: { 
            type: Type.NUMBER, 
            description: "The calculated estimated tool life in hours." 
        }
    },
    required: ["estimatedLife"]
};

export const calculateToolLife = async (tool: Omit<Tool, 'id' | 'user_id' | 'created_at'>): Promise<number | null> => {
    const prompt = `
        Given the following tool parameters:
        - Tool Type: ${tool.toolType}
        - Tool Material: ${tool.material}
        - Diameter: ${tool.diameter} mm
        - Number of Teeth: ${tool.numberOfTeeth ?? 'N/A'}
        - Cutting Speed (Vc): ${tool.cuttingSpeedVc ?? 'N/A'} m/min
        - Feed per Tooth (fz): ${tool.feedPerTooth ?? 'N/A'} mm

        Calculate an estimated tool life in hours. Assume the tool is used for a common application, such as machining mild steel or aluminum, under normal conditions. 
        Consider typical wear patterns for this type of tool and material. 
        Provide only the numeric value for the estimated life in hours in your JSON response.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: toolLifeResponseSchema,
            },
        });
        const result = cleanAndParseJson(response.text);
        if (result && typeof result.estimatedLife === 'number') {
            return Math.round(result.estimatedLife);
        }
        return null;
    } catch (error) {
        console.error("Error calling Gemini API for tool life calculation:", error);
        return null;
    }
};

const processResponseSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "The name of the process, e.g., 'Face Milling'." },
        group: { type: Type.STRING, description: "The group this process belongs to, e.g., 'Milling'." },
        compatibleMachineTypes: { type: Type.ARRAY, items: { type: Type.STRING, enum: MACHINE_TYPES } },
        parameters: {
            type: Type.ARRAY,
            description: "A list of parameters needed to calculate the time for this process.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The camelCase name for the parameter, e.g., 'lengthOfCut'." },
                    label: { type: Type.STRING, description: "The user-friendly display label, e.g., 'Length of Cut'." },
                    unit: { type: Type.STRING, description: "The metric unit for the parameter, e.g., 'mm'." },
                    imperialLabel: { type: Type.STRING, description: "Optional imperial display label, e.g., 'Surface Speed'." },
                    imperialUnit: { type: Type.STRING, description: "Optional imperial unit, e.g., 'sfm'." },
                },
                required: ["name", "label", "unit"]
            }
        },
        formula: { type: Type.STRING, description: "A JavaScript-like formula string to calculate the operation time in minutes. It can use the defined parameter names and standard Math functions (e.g., Math.ceil, Math.PI)." }
    },
    required: ["name", "group", "compatibleMachineTypes", "parameters", "formula"]
};


export const suggestProcess = async (prompt: string): Promise<GeminiProcessSuggestion | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Based on the following description, define a manufacturing process profile, including its typical calculation parameters. Description: "${prompt}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: processResponseSchema,
            },
        });
        return cleanAndParseJson(response.text) as GeminiProcessSuggestion;
    } catch (error) {
        console.error("Error calling Gemini API for process suggestion:", error);
        return null;
    }
};

export const suggestMultipleProcesses = async (prompt: string): Promise<Omit<Process, 'id' | 'user_id' | 'created_at'>[] | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Based on the following request, provide a list of manufacturing process profiles, including their typical calculation parameters. Description: "${prompt}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: processResponseSchema },
            },
        });
        return cleanAndParseJson(response.text) as GeminiProcessSuggestion[];
    } catch (error) {
        console.error("Error calling Gemini API for multiple process suggestion:", error);
        return null;
    }
};

const machineResponseSchema = (currency: string) => ({
    type: Type.OBJECT,
    properties: {
        brand: { type: Type.STRING, description: "The manufacturer of the machine, e.g., 'HAAS'." },
        model: { type: Type.STRING, description: "The model name/number, e.g., 'VF-2'." },
        hourlyRate: { type: Type.NUMBER, description: `The typical hourly operational cost in ${currency}.` },
        machineType: { type: Type.STRING, enum: MACHINE_TYPES },
        xAxis: { type: Type.NUMBER, description: "The X-axis travel in mm." },
        yAxis: { type: Type.NUMBER, description: "The Y-axis travel in mm." },
        zAxis: { type: Type.NUMBER, description: "The Z-axis travel in mm." },
        powerKw: { type: Type.NUMBER, description: "The spindle power in kilowatts (kW)." },
        additionalAxis: { type: Type.STRING, enum: ADDITIONAL_AXIS_OPTIONS },
    },
    required: ["brand", "model", "hourlyRate", "machineType", "xAxis", "yAxis", "zAxis", "powerKw", "additionalAxis"]
});

export const suggestMachine = async (prompt: string, currency: string): Promise<GeminiMachineSuggestion | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on the following description, provide a detailed machine profile. The currency for 'hourlyRate' must be ${currency}. Description: "${prompt}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: machineResponseSchema(currency),
            },
        });
        return cleanAndParseJson(response.text) as GeminiMachineSuggestion;
    } catch (error) {
        console.error("Error calling Gemini API for machine suggestion:", error);
        return null;
    }
};

export const suggestMultipleMachines = async (prompt: string, currency: string): Promise<Omit<Machine, 'id' | 'user_id' | 'created_at'>[] | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Based on the following request, provide a list of detailed machine profiles. The currency for 'hourlyRate' must be ${currency}. Request: "${prompt}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: machineResponseSchema(currency) },
            },
        });
        const suggestions = cleanAndParseJson(response.text) as GeminiMachineSuggestion[];
        return suggestions.map(s => ({...s, name: `${s.brand} ${s.model}`.trim() }));

    } catch (error) {
        console.error("Error calling Gemini API for multiple machine suggestion:", error);
        return null;
    }
};
