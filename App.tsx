import React, { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
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
import type { User, Calculation, MaterialMasterItem, Machine, Process, SubscriptionPlan, View, Tool, SubscriberInfo, Feedback, RegionCost, RegionCurrencyMap, MachiningInput } from './types';
import { SUPER_ADMIN_EMAILS, DEFAULT_PROCESSES, INITIAL_MATERIALS_MASTER, DEFAULT_MACHINES_MASTER, DEFAULT_TOOLS_MASTER, DEFAULT_CALCULATIONS_SHOWCASE, DEFAULT_REGION_CURRENCY_MAP, DEFAULT_SUBSCRIPTION_PLANS, DEFAULT_MATERIAL_NAMES, DEFAULT_MACHINE_NAMES, DEFAULT_TOOL_NAMES } from './constants';
import { SubscriptionUpgradeModal } from './components/SubscriptionUpgradeModal';
import { calculateMachiningCosts } from './services/calculationService';

const uuid = () => crypto.randomUUID();

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const fetchData = useCallback(async (currentSession: Session) => {
    if (!currentSession.user) return;

    try {
      const [calcRes, matRes, machRes, toolRes, procRes, regionCostRes, regionCurrencyRes, plansRes, profileRes] = await Promise.all([
        supabase.from('calculations').select('*').eq('user_id', currentSession.user.id),
        supabase.from('materials').select('*').eq('user_id', currentSession.user.id),
        supabase.from('machines').select('*').eq('user_id', currentSession.user.id),
        supabase.from('tools').select('*').eq('user_id', currentSession.user.id),
        supabase.from('processes').select('*').eq('user_id', currentSession.user.id),
        supabase.from('region_costs').select('*').eq('user_id', currentSession.user.id),
        supabase.from('region_currency_map').select('*').or(`user_id.eq.${currentSession.user.id},user_id.is.null`),
        supabase.from('subscription_plans').select('*'),
        supabase.from('profiles').select('*').eq('id', currentSession.user.id).single()
      ]);

      const results = [calcRes, matRes, machRes, toolRes, procRes, regionCostRes, regionCurrencyRes, plansRes, profileRes];
      for (const res of results) {
        if (res.error && res.error.code !== 'PGRST116') { // Ignore "The result contains 0 rows" error for single()
          throw res.error;
        }
      }
      
      let finalCalculations = (calcRes.data as any[]) || [];
      let finalMaterials = (matRes.data as any[]) || [];
      let finalMachines = (machRes.data as any[]) || [];
      let finalTools = (toolRes.data as any[]) || [];
      let finalProcesses = (procRes.data as any[]) || [];
      let finalRegionCurrencyMap = regionCurrencyRes.data || [];
      let allRegionCosts = regionCostRes.data || [];

      // FIX: Changed type from Promise<any>[] to PromiseLike<any>[] to match the return type of supabase calls.
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
            supabase.from('calculations').insert(showcaseTemplates as any).select().then(res => {
                if (res.error) console.error("Failed to seed showcase calculations:", res.error.message);
                else if (res.data) finalCalculations = [...finalCalculations, ...res.data];
            })
        );
      }
      
      // --- Seed User-Specific Libraries ---
      // Seed Materials only if the user has none. This makes it a one-time setup for each user.
      if (finalMaterials.length === 0) {
          const materialsToSeed = INITIAL_MATERIALS_MASTER.map(m => ({ ...m, id: uuid(), user_id: currentSession.user.id }));
          seedingOperations.push(
              supabase.from('materials').insert(materialsToSeed as any).select().then(res => {
                  if (res.error) console.error("Failed to seed materials:", res.error.message);
                  else if (res.data) finalMaterials = [...finalMaterials, ...res.data];
              })
          );
      }

      // Seed Machines only if the user has none.
      if (finalMachines.length === 0) {
          const machinesToSeed = DEFAULT_MACHINES_MASTER.map(m => ({ ...m, id: uuid(), user_id: currentSession.user.id }));
          seedingOperations.push(
              supabase.from('machines').insert(machinesToSeed as any).select().then(res => {
                  if (res.error) console.error("Failed to seed machines:", res.error.message);
                  else if (res.data) finalMachines = [...finalMachines, ...res.data];
              })
          );
      }

      // Seed Tools only if the user has none.
      if (finalTools.length === 0) {
          const toolsToSeed = DEFAULT_TOOLS_MASTER.map(t => ({ ...t, id: uuid(), user_id: currentSession.user.id }));
          seedingOperations.push(
              supabase.from('tools').insert(toolsToSeed as any).select().then(res => {
                  if (res.error) console.error("Failed to seed tools:", res.error.message);
                  else if (res.data) finalTools = [...finalTools, ...res.data];
              })
          );
      }
      
      // Seed Processes: This library remains managed. New default processes will be added to all users.
      const existingProcessNames = new Set(finalProcesses.map(p => p.name));
      const missingProcesses = DEFAULT_PROCESSES.filter(p => !existingProcessNames.has(p.name));
      if (missingProcesses.length > 0) {
          const processesToSeed = missingProcesses.map(p => ({ ...p, id: uuid(), user_id: currentSession.user.id }));
          seedingOperations.push(
              supabase.from('processes').insert(processesToSeed as any).select().then(res => {
                  if (res.error) console.error("Failed to seed processes:", res.error.message);
                  else if (res.data) finalProcesses = [...finalProcesses, ...res.data];
              })
          );
      }

      if (seedingOperations.length > 0) {
        await Promise.all(seedingOperations);
      }
      
      // --- BEGIN BACKFILL LOGIC for USA default pricing ---
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
      // --- END BACKFILL LOGIC ---

      setCalculations(finalCalculations as Calculation[]);
      setMaterials(finalMaterials);
      setMachines(finalMachines);
      setTools(finalTools);
      setProcesses(finalProcesses);
      setRegionCurrencyMap(finalRegionCurrencyMap);
      setRegionCosts(allRegionCosts);
      const plansData = (plansRes.data && plansRes.data.length > 0) ? plansRes.data : DEFAULT_SUBSCRIPTION_PLANS;
      setPlans(plansData);
      
      if (profileRes.data) {
        let profile = profileRes.data;
        const updates: Partial<User> = {};

        // Scenario 1: New user with no plan assigned yet.
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
        // Scenario 2: Existing user with a plan but no expiry date (data backfill).
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
                throw updateError;
            }
            // Use the updated profile from the DB if it returns, otherwise merge the local updates
            profile = updatedProfile || { ...profile, ...updates };
        }

        const fullUser: User = { ...profile, email: currentSession.user.email! };
        setUser(fullUser);
      }

      if (SUPER_ADMIN_EMAILS.includes(currentSession.user.email!)) {
          const { data, error } = await supabase.rpc('get_subscribers_list');
          if (error) {
            throw error;
          }
          setSubscribers(data as SubscriberInfo[]);

          const { data: feedbackData, error: feedbackError } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
          if (feedbackError) {
            throw feedbackError;
          }
          setFeedbacks(feedbackData || []);
      }

    } catch (e: any) {
        console.error("An error occurred during data fetch.", e);
        setError(`There was an unexpected error. Finish what you were doing and then refresh the page to try again. Error: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchData(session).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchData(session);
        setCurrentView('landing');
      } else {
        setUser(null);
        setCalculations([]);
        setCurrentView('auth');
      }
    });

    return () => subscription.unsubscribe();
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
    if (action === 'add') {
      const fullPayload = { ...payload, id: uuid(), user_id: user.id };
      result = await supabase.from(table).insert(fullPayload as any).select();
      if (!result.error && result.data) stateSetter(prev => [...prev, result.data[0]]);
    } else if (action === 'update') {
      result = await supabase.from(table).update(payload).eq('id', payload.id).select();
      if (!result.error && result.data) stateSetter(prev => prev.map(item => item.id === payload.id ? result.data[0] : item));
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
              throw new Error(`The region was just added, but we failed to refresh the list. Please refresh the page.`);
          } else if (refreshedData) {
              setRegionCurrencyMap(refreshedData);
          }
          return; 
      }
      throw error; 
    } else if (data && data.length > 0) {
      setRegionCurrencyMap(prev => [...prev, data[0]]);
    } else {
      // This handles cases where insert succeeds but select returns null/empty (e.g., RLS)
      const { data: refreshedData, error: refreshError } = await supabase.from('region_currency_map').select('*').or(`user_id.eq.${user.id},user_id.is.null`);
      if (refreshError) {
          throw refreshError;
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
    
    // Only set a new expiry for plans with a defined period
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
    if (!user) throw new Error("User not found");
    const fullFeedback = { ...feedback, user_id: user.id, user_email: user.email };
    const { error } = await supabase.from('feedback').insert(fullFeedback as any);
    if (error) throw error;
  }, [user]);

  if (loading) return <LoadingSpinner />;
  
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  if (!session || !user) {
    return (
      <PublicLayout theme={theme} setTheme={setTheme}>
        <AuthPage />
      </PublicLayout>
    );
  }

  const userPlan = plans.find(p => p.id === user.plan_id) || plans[0];
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email);

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
