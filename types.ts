// This file is self-contained and does not require auto-generated Supabase types.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// For Razorpay window object
declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: string; // amount in the smallest currency unit
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id?: string; // for server-side integration
  handler: (response: { razorpay_payment_id: string; razorpay_order_id?: string; razorpay_signature?: string }) => void;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: {
    address?: string;
  };
  theme?: {
    color?: string;
  };
}

export interface RegionCost {
  id: string;
  item_id: string;
  item_type: 'material' | 'machine' | 'tool';
  region: string;
  price: number;
  currency: string;
  valid_from: string; // YYYY-MM-DD
  created_at?: string;
  user_id?: string;
}

export interface RegionCurrencyMap {
  id: string;
  region: string;
  currency: string;
  user_id?: string;
  created_at?: string;
}

export interface MaterialProperty {
  value: number | string | null;
  unit: string;
}

export interface MaterialMasterItem {
  id: string;
  name: string;
  category: "P - Steel" | "M - Stainless Steel" | "K - Cast Iron" | "N - Non-ferrous" | "S - Superalloys & Titanium" | "H - Hardened Steel" | "O - Polymers" | "SO - Special Alloys" | "Other";
  subCategory?: string;
  properties: { [key: string]: MaterialProperty } | Json;
  user_id?: string;
  created_at?: string;
}

export interface Machine {
  id: string;
  name: string;
  brand: string;
  model: string;
  hourlyRate: number;
  machineType: string;
  xAxis: number;
  yAxis: number;
  zAxis: number;
  powerKw: number;
  additionalAxis: string;
  user_id?: string;
  created_at?: string;
}

export interface ProcessParameter {
    name: string;
    label: string;
    unit: string;
    imperialLabel?: string;
    imperialUnit?: string;
}

export interface Process {
  id: string;
  name: string;
  group: string;
  compatibleMachineTypes: string[];
  parameters: ProcessParameter[] | Json;
  formula?: string;
  imageUrl?: string;
  user_id?: string;
  created_at?: string;
}

export interface Tool {
  id: string;
  name: string;
  brand: string;
  model: string;
  toolType: string;
  material: string;
  diameter: number;
  cornerRadius: number | null;
  numberOfTeeth: number | null;
  arborOrInsert: 'Arbor' | 'Insert' | 'Shank';
  compatibleMachineTypes: string[];
  cuttingSpeedVc: number | null;
  feedPerTooth: number | null;
  speedRpm: number | null;
  feedRate: number | null;
  estimatedLife: number | null;
  price: number | null;
  user_id?: string;
  created_at?: string;
}

// Defines a single manufacturing step with its specific parameters
export interface Operation {
  id: string; // Unique ID for React keys
  processName: string;
  parameters: { [key: string]: number };
  toolId?: string;
  toolName?: string;
  estimatedToolLifeHours?: number;
}

export interface Setup {
  id: string;
  name: string;
  operations: Operation[];
  timePerSetupMin: number; // Setup time specific to this setup
  toolChangeTimeSec: number; // Tool change time specific to this setup (per tool change in setup)
  efficiency: number; // Setup efficiency, e.g., 0.95 for 95%
  machineType?: string; // e.g. 'CNC Mill'
  machineId?: string; // Links to a Machine from MachineMaster
  description?: string;
}

// Interface for parameters that define a specific billet shape
export interface BilletShapeParameters {
  length?: number; // mm
  width?: number; // mm
  height?: number; // mm
  diameter?: number; // mm
  outerDiameter?: number; // mm for tubes
  innerDiameter?: number; // mm for tubes
  side?: number; // mm for cubes
  wallThickness?: number; // mm for Rectangle Tube
  outerWidth?: number; // mm for Rectangle Tube
  outerHeight?: number; // mm for Rectangle Tube
}

export interface SurfaceTreatment {
  id: string;
  name: string;
  cost: number;
  unit: 'per_kg' | 'per_area';
  based_on?: 'raw_weight' | 'finished_weight';
}

export interface Markups {
  general: number;
  admin: number;
  sales: number;
  miscellaneous: number;
  packing: number;
  transport: number;
  profit: number;
  duty: number;
}

export interface MachiningInput {
  // Metadata
  id: string;
  original_id?: string; // To track showcase template ID
  calculationNumber: string;
  partNumber: string;
  partName: string; 
  customerName: string;
  revision: string;
  partImage?: string; 
  createdAt: string;
  annualVolume: number; 
  batchVolume: number; 
  unitSystem: 'Metric' | 'Imperial';
  region: string;
  currency: string;

  // Material Details
  materialCategory: string;
  materialType: string;

  // Raw Material Geometry & Weight
  rawMaterialProcess: 'Billet' | 'Casting' | 'Forging' | '3D Printing' | 'Other';
  billetShape?: 'Block' | 'Cylinder' | 'Tube' | 'Plate' | 'Bar' | 'Rod' | 'Cube' | 'Rectangle Tube';
  billetShapeParameters?: BilletShapeParameters;
  rawMaterialWeightKg: number;
  finishedPartWeightKg: number;
  partSurfaceAreaM2: number;
  
  // Raw Material Cost Buildup
  materialCostPerKg: number; 
  materialDensityGcm3: number; 
  transportCostPerKg: number;
  heatTreatmentCostPerKg: number;
  surfaceTreatments: SurfaceTreatment[];

  // Machining Operations & Setup
  setups: Setup[]; 
  
  // Markup
  markups: Markups;
}


export interface MarkupCosts {
  general: number;
  admin: number;
  sales: number;
  miscellaneous: number;
  packing: number;
  transport: number;
  profit: number;
  duty: number;
}

export interface MachiningResult {
  // Material Analysis
  rawMaterialWeightKg: number;
  finishedPartWeightKg: number;
  totalMaterialCostPerKg: number;
  rawMaterialPartCost: number;
  materialCost: number; 
  surfaceTreatmentCost: number;
  
  // Time Analysis
  operationTimeBreakdown: { processName: string; timeMin: number; id: string; machineName?: string }[];
  totalCuttingTimeMin: number;
  totalSetupTimeMin: number; 
  totalToolChangeTimeMin: number; 
  cycleTimePerPartMin: number;
  totalMachineTimeHours: number;
  
  // Cost Analysis
  machiningCost: number;
  toolCost: number;
  markupCosts: MarkupCosts;
  totalCost: number;
  costPerPart: number;
}


export interface Calculation {
  id: string;
  inputs: MachiningInput;
  results?: MachiningResult;
  status: 'draft' | 'final';
  user_id: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  companyName: string | null;
  company_logo_url: string | null;
  phone: string | null;
  phone_country_code: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  calcNextNumber: number | null;
  calcPrefix: string | null;
  plan_id: string | null;
  subscription_status: string | null;
  subscription_expires_on: string | null;
  calculations_created_this_period: number;
  company_website: string | null;
  industry: string | null;
  company_size: string | null;
  tax_id: string | null;
}

export interface PriceInfo {
  price: number;
  displayPrice?: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  prices: { [currency: string]: PriceInfo } | {} | null;
  period: "mo" | "yr" | "";
  is_custom_price: boolean;
  calculation_limit: number;
  features: string[];
  cta: string;
  most_popular: boolean;
  created_at?: string;
}

export interface SettingsPageProps {
  user: User;
  onUpdateUser: (user: Partial<User>) => void;
  plans: SubscriptionPlan[];
  onNavigate: (view: View) => void;
  isSuperAdmin: boolean;
}

export interface MaterialsPageProps {
  materials: MaterialMasterItem[];
  user: User;
  onAddMaterial: (material: MaterialMasterItem) => void;
  onUpdateMaterial: (material: MaterialMasterItem) => void;
  onDeleteMaterial: (materialId: string) => void;
  onAddMultipleMaterials: (materials: Omit<MaterialMasterItem, 'id' | 'user_id' | 'created_at'>[]) => void;
  onDeleteMultipleMaterials: (materialIds: string[]) => void;
}

export interface MachineLibraryPageProps {
  machines: Machine[];
  user: User;
  onAddMachine: (machine: Machine) => void;
  onUpdateMachine: (machine: Machine) => void;
  onDeleteMachine: (machineId: string) => void;
  onAddMultipleMachines: (machines: Omit<Machine, 'id' | 'user_id' | 'created_at'>[]) => void;
  onDeleteMultipleMachines: (machineIds: string[]) => void;
}

export interface ProcessLibraryPageProps {
  processes: Process[];
  user: User;
  onAddProcess: (process: Process) => void;
  onUpdateProcess: (process: Process) => void;
  onDeleteProcess: (processId: string) => void;
  onAddMultipleProcesses: (processes: Omit<Process, 'id' | 'user_id' | 'created_at'>[]) => void;
  onDeleteMultipleProcesses: (processIds: string[]) => void;
}

// Props for CalculatorPage, includes machines
export interface CalculatorPageProps {
  materials: MaterialMasterItem[];
  machines: Machine[];
  processes: Process[];
  tools: Tool[];
  regionCosts: RegionCost[];
  regionCurrencyMap: RegionCurrencyMap[];
  onSave: (calculation: Calculation) => void;
  onSaveDraft: (draft: Calculation) => void;
  onAutoSaveDraft: (draft: Calculation) => void;
  onBack: () => void;
  user: User;
  existingCalculation: Calculation | null;
  theme: 'light' | 'dark';
}

export interface DashboardPageProps {
  user: User;
  calculations: Calculation[];
  onNavigate: (view: View) => void;
  onEdit: (calculation: Calculation) => void;
  onDelete: (calculationId: string) => void;
  onViewResults: (calculation: Calculation) => void;
  userPlan: SubscriptionPlan | undefined;
  onUpgrade: () => void;
  isSuperAdmin: boolean;
  theme: 'light' | 'dark';
}

export interface ResultsPageProps {
  user: User;
  calculation: Calculation | null;
  onBack: () => void;
}

export interface SubscriptionPageProps {
  plans: SubscriptionPlan[];
  user: User;
  isSuperAdmin: boolean;
  onUpgradePlan: (planId: string) => void;
  onBack: () => void;
}

export interface SuperAdminPageProps {
    plans: SubscriptionPlan[];
    onAddPlan: (plan: SubscriptionPlan) => void;
    onUpdatePlan: (plan: SubscriptionPlan) => void;
    onDeletePlan: (planId: string) => void;
}

export interface SubscriberInfo {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  calculation_count: number;
  subscribed_on: string;
  subscription_expires_on: string | null;
}

export interface UserManagementPageProps {
  subscribers: SubscriberInfo[];
  theme: 'light' | 'dark';
  plans: SubscriptionPlan[];
}

export interface ToolLibraryPageProps {
  tools: Tool[];
  user: User;
  onAddTool: (tool: Tool) => void;
  onUpdateTool: (tool: Tool) => void;
  onDeleteTool: (toolId: string) => void;
  onAddMultipleTools: (tools: Omit<Tool, 'id' | 'user_id' | 'created_at'>[]) => void;
  onDeleteMultipleTools: (toolIds: string[]) => void;
}

export type GeminiSuggestion = {
    name: string;
    category: "P - Steel" | "M - Stainless Steel" | "K - Cast Iron" | "N - Non-ferrous" | "S - Superalloys & Titanium" | "H - Hardened Steel" | "O - Polymers" | "SO - Special Alloys" | "Other";
    subCategory?: string;
    properties: { [key: string]: MaterialProperty };
};

export type GeminiToolSuggestion = Omit<Tool, 'id' | 'user_id' | 'created_at' | 'speedRpm' | 'feedRate' | 'name'>;
export type GeminiProcessSuggestion = Omit<Process, 'id' | 'user_id' | 'created_at'>;
export type GeminiMachineSuggestion = Omit<Machine, 'id' | 'user_id' | 'created_at' | 'name'>;

export interface Feedback {
  id?: string;
  user_id: string;
  user_email: string;
  usage_duration: string;
  usage_experience: string;
  feature_requests: string | null;
  suggested_changes: string | null;
  created_at?: string;
}

export interface FeedbackPageProps {
  user: User;
  onSubmit: (feedbackData: Omit<Feedback, 'id' | 'user_id' | 'user_email' | 'created_at'>) => Promise<void>;
}

export interface FeedbackListPageProps {
  feedbacks: Feedback[];
}

export interface CostMasterPageProps {
  materials: MaterialMasterItem[];
  machines: Machine[];
  tools: Tool[];
  regionCosts: RegionCost[];
  regionCurrencyMap: RegionCurrencyMap[];
  user: User;
  onUpdateMaterial: (material: MaterialMasterItem) => void;
  onUpdateMachine: (machine: Machine) => void;
  onUpdateTool: (tool: Tool) => void;
  onAddRegionCost: (cost: Omit<RegionCost, 'id' | 'created_at' | 'user_id'>) => void;
  onUpdateRegionCost: (cost: Pick<RegionCost, 'id' | 'price' | 'valid_from'>) => void;
  onDeleteRegionCost: (costId: string) => void;
  onAddRegionCurrency: (map: Omit<RegionCurrencyMap, 'id' | 'created_at' | 'user_id'>) => void;
  onDeleteRegionCurrency: (id: string) => void;
}

export interface ChangeItem {
  type: 'new' | 'improvement' | 'fix';
  description: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: ChangeItem[];
}

export interface ChangelogPageProps {}

export type View = 
  | 'auth'
  | 'landing'
  | 'calculations' 
  | 'calculator' 
  | 'results' 
  | 'materials' 
  | 'machines' 
  | 'processes' 
  | 'settings' 
  | 'superadmin' 
  | 'subscription' 
  | 'toolLibrary' 
  | 'subscribersList'
  | 'costMaster'
  | 'feedback'
  | 'feedbackList'
  | 'changelog'
  | 'resetPassword';