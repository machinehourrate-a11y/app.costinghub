import React, { useState, useEffect, useCallback, useRef } from 'react';
// FIX: The `Session` type is not exported in older versions of `@supabase/supabase-js`.
// It will be inferred as `any` to resolve the compilation error.
// import type { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';

import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { ResultsPage } from './pages/ResultsPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { MachineLibraryPage } from './pages/MachineMasterPage';
import { ProcessLibraryPage } from './pages/ProcessMasterPage';
import { SettingsPage } from './pages/SettingsPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { ToolLibraryPage } from './pages/ToolLibraryPage';
import { CostMasterPage } from './pages/CostMasterPage';
import { MainLayout } from './layouts/MainLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { UserManagementPage } from './pages/UserManagementPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { LandingPage } from './pages/LandingPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { FeedbackListPage } from './pages/FeedbackListPage';
import { ChangelogPage } from './pages/ChangelogPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import type { User, Calculation, MaterialMasterItem, Machine, Process, SubscriptionPlan, View, Tool, SubscriberInfo, Feedback, RegionCost, RegionCurrencyMap, MachiningInput } from './types';
import { SUPER_ADMIN_EMAILS, DEFAULT_PROCESSES, INITIAL_MATERIALS_MASTER, DEFAULT_MACHINES_MASTER, DEFAULT_TOOLS_MASTER, DEFAULT_CALCULATIONS_SHOWCASE, DEFAULT_REGION_CURRENCY_MAP, DEFAULT_SUBSCRIPTION_PLANS, DEFAULT_MATERIAL_NAMES, DEFAULT_MACHINE_NAMES, DEFAULT_TOOL_NAMES, DEFAULT_PROCESS_NAMES } from './constants';
import { SubscriptionUpgradeModal } from './components/SubscriptionUpgradeModal';
import { calculateMachiningCosts } from './services/calculationService';

const uuid = () => crypto.randomUUID();

const App: React.FC = () => {
  // FIX: Using `any` as `Session` type is not available in the version of the library implied by the errors.
  const [session, setSession] = useState<any | null | undefined>(undefined);
  const [user, setUser] = useState<User | null>(null);
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [materials, setMaterials] = useState<MaterialMasterItem[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberInfo[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [regionCosts, setRegionCosts] = useState<RegionCost[]>([]);
  const [regionCurrencyMap, setRegionCurrencyMap] = useState<RegionCurrencyMap[]>([]);
  
  const [currentView, setCurrentView] = useState<View>('auth');
  const [editingCalculation, setEditingCalculation] = useState<Calculation | null>(null);
  const [viewingCalculation, setViewingCalculation] = useState<Calculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);
  
  const isInRecoveryFlow = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // FIX: Using `any` as `Session` type is not available in the version of the library implied by the errors.
  const fetchData = useCallback(async (currentSession: any) => {
    if (!currentSession.user) return;

    try {
      const isCurrentUserSuperAdmin = SUPER_ADMIN_EMAILS.includes(currentSession.user.email!.toLowerCase());

      const [calcRes, matRes, machRes, toolRes, allProcRes, regionCostRes, regionCurrencyRes, plansRes, profileRes] = await Promise.all([
        supabase.from('calculations').select('*').eq('user_id', currentSession.user.id),
        supabase.from('materials').select('*').eq('user_id', currentSession.user.id),
        supabase.from('machines').select('*').eq('user_id', currentSession.user.id),
        supabase.from('tools').select('*').eq('user_id', currentSession.user.id),
        // Fetch global processes AND this user's custom processes in one query
        supabase.from('processes').select('*').or(`user_id.eq.${currentSession.user.id},user_id.is.null`),
        supabase.from('region_costs').select('*').eq('user_id', currentSession.user.id),
        supabase.from('region_currency_map').select('*').or(`user_id.eq.${currentSession.user.id},user_id.is.null`),
        supabase.from('subscription_plans').select('*'),
        supabase.from('profiles').select('*').eq('id', currentSession.user.id).single()
      ]);

      const results = [calcRes, matRes, machRes, toolRes, allProcRes, regionCostRes, regionCurrencyRes, plansRes, profileRes];
      for (const res of results) {
        if (res.error && res.error.code !== 'PGRST116') { // Ignore "The result contains 0 rows" error for single()
          throw new Error(res.error.message);
        }
      }
      
      let finalCalculations = (calcRes.data as any[]) || [];
      let finalMaterials = (matRes.data as any[]) || [];
      let finalMachines = (machRes.data as any[]) || [];
      let finalTools = (toolRes.data as any[]) || [];
      let finalRegionCurrencyMap = regionCurrencyRes.data || [];
      let allRegionCosts = regionCostRes.data || [];
      let allProcesses = (allProcRes.data as Process[]) || [];

      const seedingOperations: PromiseLike<any>[] = [];

      // --- Seed Showcase Calculations ---
      const existingOriginalIds = new Set(finalCalculations.map(c => (c.inputs as MachiningInput).original_id).filter(Boolean));
      const missingShowcaseCalculations = DEFAULT_CALCULATIONS_SHOWCASE.filter(
          calc => !existingOriginalIds.has(calc.id)
      );
      if (missingShowcaseCalculations.length > 0) {
        const showcaseTemplates = missingShowcaseCalculations.map(calc => {
            const newId = uuid();
            const results = calculateMachiningCosts(calc.inputs, DEFAULT_MACHINES_MASTER, DEFAULT_PROCESSES, DEFAULT_TOOLS_MASTER, []);
            return {
                id: newId,
                user_id: currentSession.user.id,
                status: calc.status,
                inputs: { ...calc.inputs, id: uuid(), original_id: calc.id },
                results: results,
            };
        });
        seedingOperations.push(
            supabase.from('calculations').insert(showcaseTemplates as any).select()
            .then(res => {
                if (res.error) console.error("Failed to seed showcase calculations:", res.error.message);
                else if (res.data) finalCalculations = [...finalCalculations, ...res.data];
            })
            .catch(err => console.warn("Seeding calculations ignored due to error", err))
        );
      }
      
      // --- Seed User-Specific Libraries ---
      if (finalMaterials.length === 0) {
          const materialsToSeed = INITIAL_MATERIALS_MASTER.map(m => ({ ...m, id: uuid(), user_id: currentSession.user.id }));
          seedingOperations.push(
              supabase.from('materials').insert(materialsToSeed as any).select()
              .then(res => {
                  if (res.error) console.error("Failed to seed materials:", res.error.message);
                  else if (res.data) finalMaterials = [...finalMaterials, ...res.data];
              })
              .catch(err => console.warn("Seeding materials ignored due to error", err))
          );
      }

      if (finalMachines.length === 0) {
          const machinesToSeed = DEFAULT_MACHINES_MASTER.map(m => ({ ...m, id: uuid(), user_id: currentSession.user.id }));
          seedingOperations.push(
              supabase.from('machines').insert(machinesToSeed as any).select()
              .then(res => {
                  if (res.error) console.error("Failed to seed machines:", res.error.message);
                  else if (res.data) finalMachines = [...finalMachines, ...res.data];
              })
              .catch(err => console.warn("Seeding machines ignored due to error", err))
          );
      }

      if (finalTools.length === 0) {
          const toolsToSeed = DEFAULT_TOOLS_MASTER.map(t => ({ ...t, id: uuid(), user_id: currentSession.user.id }));
          seedingOperations.push(
              supabase.from('tools').insert(toolsToSeed as any).select()
              .then(res => {
                  if (res.error) console.error("Failed to seed tools:", res.error.message);
                  else if (res.data) finalTools = [...finalTools, ...res.data];
              })
              .catch(err => console.warn("Seeding tools ignored due to error", err))
          );
      }

      // --- Seed Region Currency Maps ---
      const defaultsToCheck = DEFAULT_REGION_CURRENCY_MAP.filter(m => m.region !== 'Default');
      
      const missingRegions = defaultsToCheck.filter(
          def => !finalRegionCurrencyMap.some(rcm => rcm.region === def.region)
      );

      if (missingRegions.length > 0) {
           const regionsToInsert = missingRegions.map(def => ({
              region: def.region,
              currency: def.currency,
              id: uuid(),
              user_id: currentSession.user.id
          }));

           seedingOperations.push(
              supabase.from('region_currency_map')
                .upsert(regionsToInsert as any, { onConflict: 'region', ignoreDuplicates: true })
                .select()
                .then(res => {
                    if (res.data) {
                        finalRegionCurrencyMap = [...finalRegionCurrencyMap, ...res.data];
                    }
                    if (res.error) {
                        console.debug("Region seeding info:", res.error.message);
                    }
                })
                .catch(err => console.warn("Seeding regions ignored due to error", err))
          );
      }

      // --- Seed Global Processes (if they don't exist in the database) ---
      // Seeding global data is a superadmin responsibility. This will run on first superadmin login.
      if (isCurrentUserSuperAdmin) {
        const existingGlobalProcessNames = new Set(allProcesses.filter(p => p.user_id === null).map(p => p.name));
        const missingGlobalProcesses = DEFAULT_PROCESSES.filter(p => !existingGlobalProcessNames.has(p.name));

        if (missingGlobalProcesses.length > 0) {
            const processesToSeed = missingGlobalProcesses.map(p => ({
                ...p,
                id: uuid(),
                user_id: null, // Mark as global
            }));
            seedingOperations.push(
                supabase.from('processes').insert(processesToSeed as any).select()
                .then(res => {
                    if (res.error) {
                        console.error("Failed to seed global processes:", res.error.message);
                    } else if (res.data) {
                        allProcesses = [...allProcesses, ...res.data];
                    }
                })
                .catch(err => console.warn("Seeding global processes failed:", err))
            );
        }
      }


      if (seedingOperations.length > 0) {
        await Promise.all(seedingOperations);
      }
      
      // --- FAILSAFE: Force Default Regions into Local State ---
      const mandatoryRegions = DEFAULT_REGION_CURRENCY_MAP.filter(m => m.region !== 'Default');
      mandatoryRegions.forEach(def => {
         const exists = finalRegionCurrencyMap.some(existing => existing.region === def.region);
         if (!exists) {
             finalRegionCurrencyMap.push({
                 ...def,
                 id: uuid(), 
                 user_id: currentSession.user.id,
                 created_at: new Date().toISOString()
             } as any);
         }
      });
      
      // --- Backfill Logic ---
      const backfillUsdPricingOps: Promise<void>[] = [];
      const now = new Date().toISOString();
      const userId = currentSession.user.id;
      
      const createBackfillPromise = (items: any[], type: 'material' | 'machine' | 'tool', nameSet: Set<string>, priceSelector: (item: any) => number | null | undefined): PromiseLike<void> | null => {
          const defaultItems = items.filter(item => nameSet.has(item.name));
          const itemsToBackfill = defaultItems.filter(item => 
              !allRegionCosts.some(rc => rc.item_id === item.id && rc.item_type === type && rc.region === 'United States')
          );

          if (itemsToBackfill.length > 0) {
              const newCosts = itemsToBackfill.map(item => ({
                  item_id: item.id,
                  item_type: type,
                  region: 'United States',
                  price: priceSelector(item) || 0,
                  currency: 'USD',
                  valid_from: now,
                  user_id: userId,
              })).filter(rc => rc.price > 0);

              if (newCosts.length > 0) {
                  return supabase.from('region_costs').insert(newCosts as any).select().then(res => {
                      if (res.error) {
                          console.error(`Failed to backfill ${type} USD prices:`, res.error.message);
                      } else if (res.data) {
                          allRegionCosts = [...allRegionCosts, ...res.data];
                      }
                  });
              }
          }
          return null;
      };
      
      const materialPromise = createBackfillPromise(finalMaterials, 'material', DEFAULT_MATERIAL_NAMES, item => (item.properties as any)['Cost Per Kg']?.value);
      const machinePromise = createBackfillPromise(finalMachines, 'machine', DEFAULT_MACHINE_NAMES, item => item.hourlyRate);
      const toolPromise = createBackfillPromise(finalTools, 'tool', DEFAULT_TOOL_NAMES, item => item.price);
      
      const allPromises = [materialPromise, machinePromise, toolPromise].filter((p): p is PromiseLike<void> => p !== null);

      if (allPromises.length > 0) {
          await Promise.all(allPromises);
      }

      setCalculations(finalCalculations as Calculation[]);
      setMaterials(finalMaterials);
      setMachines(finalMachines);
      setTools(finalTools);
      setProcesses(allProcesses);
      setRegionCurrencyMap(finalRegionCurrencyMap);
      setRegionCosts(allRegionCosts);
      const plansData = (plansRes.data && plansRes.data.length > 0) ? plansRes.data : DEFAULT_SUBSCRIPTION_PLANS;
      setPlans(plansData);
      
      if (profileRes.data) {
        let profile = profileRes.data;
        const updates: Partial<User> = {};

        if (!profile.plan_id) {
            const freePlan = plansData.find(p => p.name === 'Free');
            if (freePlan) {
                const expires = new Date(currentSession.user.created_at);
                expires.setFullYear(expires.getFullYear() + 1);
                
                updates.plan_id = freePlan.id;
                updates.subscription_status = 'active';
                updates.subscription_expires_on = expires.toISOString();
            }
        } 
        else if (!profile.subscription_expires_on) {
            const userPlan = plansData.find(p => p.id === profile.plan_id);
            let expires: Date | null = null;
            if (userPlan) {
                if (userPlan.name === 'Free' || userPlan.period === '') {
                    const creationDate = new Date(currentSession.user.created_at);
                    creationDate.setFullYear(creationDate.getFullYear() + 1);
                    expires = creationDate;
                } else if (userPlan.period === 'mo') {
                    const oneMonthFromNow = new Date();
                    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
                    expires = oneMonthFromNow;
                } else if (userPlan.period === 'yr') {
                    const oneYearFromNow = new Date();
                    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
                    expires = oneYearFromNow;
                }
            }
            if (expires) {
                updates.subscription_expires_on = expires.toISOString();
            }
        }

        if (Object.keys(updates).length > 0) {
            const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update(updates as any)
                .eq('id', currentSession.user.id)
                .select()
                .single();

            if (updateError && updateError.code !== 'PGRST116') {
                throw new Error(updateError.message);
            }
            profile = updatedProfile || { ...profile, ...updates };
        }

        const fullUser: User = { ...profile, email: currentSession.user.email! };
        setUser(fullUser);
      }

      if (isCurrentUserSuperAdmin) {
          const { data, error } = await supabase.rpc('get_subscribers_list');
          if (error) {
            throw new Error(error.message);
          }
          setSubscribers(data as SubscriberInfo[]);

          const { data: feedbackData, error: feedbackError } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
          if (feedbackError) {
            throw new Error(feedbackError.message);
          }
          setFeedbacks(feedbackData || []);
      }

    } catch (e: unknown) {
        console.error("An error occurred during data fetch.", e);
        let errorMessage = "An unknown error occurred.";
        if (e instanceof Error) {
            errorMessage = e.message;
        } else if (e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string') {
            errorMessage = (e as { message: string }).message;
        } else if (typeof e === 'string') {
            errorMessage = e;
        }
        setError(`Failed to load application data. Please refresh the page. If the problem persists, contact support. Error: ${errorMessage}`);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
        isInRecoveryFlow.current = true;
    }

    // FIX: Correctly destructure the subscription from the `data` object returned by `onAuthStateChange`.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
          isInRecoveryFlow.current = true;
      }

      if (session && isInRecoveryFlow.current) {
          setSession(session);
          setCurrentView('resetPassword');
          setLoading(false);
          return;
      }
      
      if (session) {
        setSession(session);
        setLoading(true);
        fetchData(session).finally(() => {
          setCurrentView('landing');
          setLoading(false);
        });
        return;
      }
      
      isInRecoveryFlow.current = false;
      setSession(null);
      setUser(null);
      setCalculations([]);
      setCurrentView('auth');
      setLoading(false);
    });

    // FIX: `getSession` is an async method in v2, but the errors suggest an older API. `session()` is the synchronous equivalent in v1.
    const session = supabase.auth.session();
    if (!session && !window.location.hash.includes('type=recovery')) {
        setLoading(false);
    }

    return () => subscription?.unsubscribe();
  }, [fetchData]);

  const handleNavigation = useCallback((view: View) => {
    setEditingCalculation(null);
    setViewingCalculation(null);
    setCurrentView(view);
  }, []);
  
  const handleUpdateUser = useCallback(async (updatedUser: Partial<User>) => {
    if (!user) return;
    const { data, error } = await supabase.from('profiles').update(updatedUser as any).eq('id', user.id).select();
    if (error) {
      setError(error.message);
    } else if (data) {
      setUser(prev => ({ ...prev!, ...data[0] }));
    }
  }, [user]);

  const handleSaveCalculation = useCallback(async (calculation: Calculation) => {
    const { data, error } = await supabase.from('calculations').upsert(calculation as any).select();
    if (error) {
      setError(error.message);
    } else if (data) {
      setCalculations(prev => [...prev.filter(c => c.id !== calculation.id), data[0] as unknown as Calculation]);
      handleUpdateUser({ calcNextNumber: (user?.calcNextNumber || 101) + 1 });
      handleNavigation('results');
      setViewingCalculation(data[0] as unknown as Calculation);
    }
  }, [user, handleUpdateUser, handleNavigation]);
  
  const handleAutoSaveDraft = useCallback(async (draft: Calculation) => {
    const { data, error } = await supabase.from('calculations').upsert(draft as any).select();
    if (error) {
      console.error("Autosave failed:", error.message);
    } else if (data) {
       setCalculations(prev => [...prev.filter(c => c.id !== draft.id), data[0] as unknown as Calculation]);
    }
  }, []);
  
  const handleSaveDraft = useCallback(async (draft: Calculation) => {
    await handleAutoSaveDraft(draft);
    handleNavigation('calculations');
  }, [handleAutoSaveDraft, handleNavigation]);

  const handleDeleteCalculation = useCallback(async (calculationId: string) => {
    const { error } = await supabase.from('calculations').delete().eq('id', calculationId);
    if (error) {
      setError(error.message);
    } else {
      setCalculations(prev => prev.filter(c => c.id !== calculationId));
    }
  }, []);
  
  const crudHandler = useCallback(async (table: 'materials' | 'machines' | 'processes' | 'tools' | 'subscription_plans' | 'region_costs', action: 'add' | 'update' | 'delete' | 'add_multiple' | 'delete_multiple', payload: any, stateSetter: React.Dispatch<React.SetStateAction<any[]>>) => {
    if (!user) return;
    let result;
    
    // Check if this is a Super Admin updating a Standard Process
    const shouldSyncGlobal = table === 'processes' && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()) && DEFAULT_PROCESS_NAMES.has(payload.name);

    if (action === 'add') {
      const fullPayload = { ...payload, id: uuid(), user_id: user.id };
      result = await supabase.from(table).insert(fullPayload as any).select();
      if (!result.error && result.data) stateSetter(prev => [...prev, result.data[0]]);
      
      if (shouldSyncGlobal && !result.error) {
          // Also create a global record
          const globalPayload = { ...payload, id: uuid(), user_id: null };
          await supabase.from(table).insert(globalPayload as any);
      }

    } else if (action === 'update') {
      result = await supabase.from(table).update(payload).eq('id', payload.id).select();
      if (!result.error && result.data) stateSetter(prev => prev.map(item => item.id === payload.id ? result.data[0] : item));
      
      if (shouldSyncGlobal && !result.error) {
          // Find existing global record by name and update it, or create if missing
          const { data: existingGlobal } = await supabase.from(table).select('id').eq('name', payload.name).is('user_id', null).single();
          
          // Prepare update payload (exclude IDs and user-specific fields)
          const updateData = { ...payload };
          delete updateData.id;
          delete updateData.user_id;
          delete updateData.created_at;

          if (existingGlobal) {
              await supabase.from(table).update(updateData).eq('id', existingGlobal.id);
          } else {
              await supabase.from(table).insert({ ...updateData, id: uuid(), user_id: null });
          }
      }

    } else if (action === 'delete') {
      result = await supabase.from(table).delete().eq('id', payload);
      if (!result.error) stateSetter(prev => prev.filter(item => item.id !== payload));
    } else if (action === 'add_multiple') {
      const fullPayloads = payload.map((item: any) => ({ ...item, id: uuid(), user_id: user.id }));
      result = await supabase.from(table).insert(fullPayloads as any).select();
      if (!result.error && result.data) stateSetter(prev => [...prev, ...result.data]);
    } else if (action === 'delete_multiple') {
      result = await supabase.from(table).delete().in('id', payload);
      if (!result.error) stateSetter(prev => prev.filter(item => !payload.includes(item.id)));
    }
    
    if (result && result.error) {
      if (result.error.code === '23505' && (action === 'add' || action === 'add_multiple')) {
        const singularTable = table === 'processes' ? 'process' : table.slice(0, -1).replace('_', ' ');
        setError(`A ${singularTable} with this name or a conflicting unique identifier already exists. Please choose a different name.`);
        console.warn(`Duplicate entry violation on table '${table}'.`, payload, result.error);
      } else {
        console.error(`Error performing ${action} on ${table}:`, result.error);
        setError(`There was an unexpected error. Please try again. Message: ${result.error.message}`);
      }
    }
  }, [user]);

  const handleAddRegionCurrency = useCallback(async (map: Omit<RegionCurrencyMap, 'id' | 'created_at' | 'user_id'>) => {
    if (!user) throw new Error("User not authenticated");
    const { data, error } = await supabase.from('region_currency_map').insert({ ...map, user_id: user.id }).select();
    
    if (error) {
      if (error.code === '23505') { 
          const { data: refreshedData, error: refreshError } = await supabase.from('region_currency_map').select('*').or(`user_id.eq.${user.id},user_id.is.null`);
          if (refreshError) {
              throw new Error(`The region was just added, but we failed to refresh the list. Please refresh the page. Error: ${refreshError.message || 'Unknown error'}`);
          } else if (refreshedData) {
              setRegionCurrencyMap(refreshedData);
          }
          return; 
      }
      throw new Error(error.message || 'Failed to add region mapping.'); 
    } else if (data && data.length > 0) {
      setRegionCurrencyMap(prev => [...prev, data[0]]);
    } else {
      const { data: refreshedData, error: refreshError } = await supabase.from('region_currency_map').select('*').or(`user_id.eq.${user.id},user_id.is.null`);
      if (refreshError) {
          throw new Error(refreshError.message || 'Failed to refresh region list after adding.');
      } else if (refreshedData) {
          setRegionCurrencyMap(refreshedData);
      }
    }
  }, [user]);

  const handleDeleteRegionCurrency = useCallback(async (id: string) => {
    const { error } = await supabase.from('region_currency_map').delete().eq('id', id);
    if (error) {
      setError(`Error deleting region mapping: ${error.message}`);
    } else {
      setRegionCurrencyMap(prev => prev.filter(rcm => rcm.id !== id));
    }
  }, []);

  const handleUpgradePlan = useCallback(async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan || !user) return;
    
    const expires = new Date();
    let expiryDate: string | null = null;
    
    if (plan.period === 'mo') {
      expires.setMonth(expires.getMonth() + 1);
      expiryDate = expires.toISOString();
    } else if (plan.period === 'yr') {
      expires.setFullYear(expires.getFullYear() + 1);
      expiryDate = expires.toISOString();
    }
    
    const updates: Partial<User> = {
      plan_id: planId,
      subscription_status: 'active',
      subscription_expires_on: expiryDate
    };

    await handleUpdateUser(updates);
    handleNavigation('calculations');
  }, [handleUpdateUser, handleNavigation, plans, user]);

  const handleSubmitFeedback = useCallback(async (feedback: Omit<Feedback, 'id' | 'user_id' | 'user_email' | 'created_at'>) => {
    if (!user) throw new Error("User not authenticated for submitting feedback.");
    const fullFeedback = { ...feedback, user_id: user.id, user_email: user.email };
    const { error } = await supabase.from('feedback').insert(fullFeedback as any);
    if (error) throw new Error(error.message || 'Failed to submit feedback.');
  }, [user]);

  if (loading) return <LoadingSpinner />;
  
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  if (currentView === 'resetPassword') {
    return (
      <PublicLayout theme={theme} setTheme={setTheme}>
        <ResetPasswordPage onPasswordReset={async () => {
          window.history.replaceState(null, '', window.location.pathname);
          isInRecoveryFlow.current = false;
          setAuthSuccessMessage("Your password has been reset successfully! Please log in.");
          await supabase.auth.signOut();
        }} />
      </PublicLayout>
    );
  }

  if (!session || !user) {
    return (
      <PublicLayout theme={theme} setTheme={setTheme}>
        <AuthPage successMessage={authSuccessMessage} setSuccessMessage={setAuthSuccessMessage} />
      </PublicLayout>
    );
  }

  const userPlan = plans.find(p => p.id === user.plan_id) || plans[0];
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

  let content;
  switch (currentView) {
    case 'landing': content = <LandingPage onNavigate={handleNavigation} userName={user.name} />; break;
    case 'calculations': content = <DashboardPage user={user} calculations={calculations} onNavigate={handleNavigation} onEdit={(calc) => { setEditingCalculation(calc); setCurrentView('calculator'); }} onDelete={handleDeleteCalculation} onViewResults={(calc) => { setViewingCalculation(calc); setCurrentView('results'); }} userPlan={userPlan} onUpgrade={() => setIsUpgradeModalOpen(true)} isSuperAdmin={isSuperAdmin} theme={theme} />; break;
    case 'calculator': content = <CalculatorPage user={user} materials={materials} machines={machines} processes={processes} tools={tools} regionCosts={regionCosts} regionCurrencyMap={regionCurrencyMap} onSave={handleSaveCalculation} onSaveDraft={handleSaveDraft} onAutoSaveDraft={handleAutoSaveDraft} onBack={() => handleNavigation('calculations')} existingCalculation={editingCalculation} theme={theme} />; break;
    case 'results': content = <ResultsPage user={user} calculation={viewingCalculation} onBack={() => handleNavigation('calculations')} />; break;
    case 'materials': content = <MaterialsPage materials={materials} user={user} onAddMaterial={(mat) => crudHandler('materials', 'add', mat, setMaterials)} onUpdateMaterial={(mat) => crudHandler('materials', 'update', mat, setMaterials)} onDeleteMaterial={(id) => crudHandler('materials', 'delete', id, setMaterials)} onAddMultipleMaterials={(mats) => crudHandler('materials', 'add_multiple', mats, setMaterials)} onDeleteMultipleMaterials={(ids) => crudHandler('materials', 'delete_multiple', ids, setMaterials)} />; break;
    case 'machines': content = <MachineLibraryPage machines={machines} user={user} onAddMachine={(mach) => crudHandler('machines', 'add', mach, setMachines)} onUpdateMachine={(mach) => crudHandler('machines', 'update', mach, setMachines)} onDeleteMachine={(id) => crudHandler('machines', 'delete', id, setMachines)} onAddMultipleMachines={(machs) => crudHandler('machines', 'add_multiple', machs, setMachines)} onDeleteMultipleMachines={(ids) => crudHandler('machines', 'delete_multiple', ids, setMachines)} />; break;
    case 'processes': content = <ProcessLibraryPage processes={processes} user={user} onAddProcess={(proc) => crudHandler('processes', 'add', proc, setProcesses)} onUpdateProcess={(proc) => crudHandler('processes', 'update', proc, setProcesses)} onDeleteProcess={(id) => crudHandler('processes', 'delete', id, setProcesses)} onAddMultipleProcesses={(procs) => crudHandler('processes', 'add_multiple', procs, setProcesses)} onDeleteMultipleProcesses={(ids) => crudHandler('processes', 'delete_multiple', ids, setProcesses)} />; break;
    case 'toolLibrary': content = <ToolLibraryPage tools={tools} user={user} onAddTool={(tool) => crudHandler('tools', 'add', tool, setTools)} onUpdateTool={(tool) => crudHandler('tools', 'update', tool, setTools)} onDeleteTool={(id) => crudHandler('tools', 'delete', id, setTools)} onAddMultipleTools={(tls) => crudHandler('tools', 'add_multiple', tls, setTools)} onDeleteMultipleTools={(ids) => crudHandler('tools', 'delete_multiple', ids, setTools)} />; break;
    case 'costMaster': content = <CostMasterPage materials={materials} machines={machines} tools={tools} regionCosts={regionCosts} regionCurrencyMap={regionCurrencyMap} user={user} onUpdateMaterial={(mat) => crudHandler('materials', 'update', mat, setMaterials)} onUpdateMachine={(mach) => crudHandler('machines', 'update', mach, setMachines)} onUpdateTool={(tool) => crudHandler('tools', 'update', tool, setTools)} onAddRegionCost={(cost) => crudHandler('region_costs', 'add', cost, setRegionCosts)} onUpdateRegionCost={(cost) => crudHandler('region_costs', 'update', cost, setRegionCosts)} onDeleteRegionCost={(id) => crudHandler('region_costs', 'delete', id, setRegionCosts)} onAddRegionCurrency={handleAddRegionCurrency} onDeleteRegionCurrency={handleDeleteRegionCurrency} />; break;
    case 'settings': content = <SettingsPage user={user} onUpdateUser={handleUpdateUser} plans={plans} onNavigate={handleNavigation} isSuperAdmin={isSuperAdmin} />; break;
    case 'superadmin': content = <SuperAdminPage plans={plans} onAddPlan={(plan) => crudHandler('subscription_plans', 'add', plan, setPlans)} onUpdatePlan={(plan) => crudHandler('subscription_plans', 'update', plan, setPlans)} onDeletePlan={(id) => crudHandler('subscription_plans', 'delete', id, setPlans)} />; break;
    case 'subscription': content = <SubscriptionPage plans={plans} user={user} isSuperAdmin={isSuperAdmin} onUpgradePlan={handleUpgradePlan} onBack={() => handleNavigation('settings')} />; break;
    case 'subscribersList': content = <UserManagementPage subscribers={subscribers} theme={theme} plans={plans} />; break;
    case 'feedback': content = <FeedbackPage user={user} onSubmit={handleSubmitFeedback} />; break;
    case 'feedbackList': content = <FeedbackListPage feedbacks={feedbacks} />; break;
    case 'changelog': content = <ChangelogPage />; break;
    default: content = <DashboardPage user={user} calculations={calculations} onNavigate={handleNavigation} onEdit={(calc) => { setEditingCalculation(calc); setCurrentView('calculator'); }} onDelete={handleDeleteCalculation} onViewResults={(calc) => { setViewingCalculation(calc); setCurrentView('results'); }} userPlan={userPlan} onUpgrade={() => setIsUpgradeModalOpen(true)} isSuperAdmin={isSuperAdmin} theme={theme} />;
  }

  return (
    <MainLayout user={user} currentView={currentView} onNavigate={handleNavigation} onLogout={() => supabase.auth.signOut()} editingCalculation={editingCalculation} theme={theme} setTheme={setTheme}>
      {isUpgradeModalOpen && <SubscriptionUpgradeModal onClose={() => setIsUpgradeModalOpen(false)} onNavigate={() => { setIsUpgradeModalOpen(false); handleNavigation('subscription'); }} />}
      {content}
    </MainLayout>
  );
};

export default App;
