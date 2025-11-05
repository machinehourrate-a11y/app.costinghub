
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { MainLayout } from './layouts/MainLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { UserManagementPage } from './pages/UserManagementPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { LandingPage } from './pages/LandingPage';
import { FeedbackPage } from './pages/FeedbackPage';
import type { User, Calculation, MaterialMasterItem, MachiningInput, Machine, Process, SubscriptionPlan, View, Tool, SubscriberInfo, Feedback } from './types';
import { SUPER_ADMIN_EMAILS, DEFAULT_PROCESSES, INITIAL_MATERIALS_MASTER, DEFAULT_MACHINES_MASTER, DEFAULT_TOOLS_MASTER, DEFAULT_CALCULATIONS_SHOWCASE } from './constants';
import { SubscriptionUpgradeModal } from './components/SubscriptionUpgradeModal';

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
  
  const [currentView, setCurrentView] = useState<View>('auth');
  const [editingCalculation, setEditingCalculation] = useState<Calculation | null>(null);
  const [viewingCalculation, setViewingCalculation] = useState<Calculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const isInitialUserLoad = useRef(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Effect to apply the theme to the document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);


  const fetchData = useCallback(async (currentSession: Session) => {
    if (!currentSession.user) return;
    
    // Seed showcases for new users
    const { data: existingCalcs, error: fetchError } = await supabase.from('calculations').select('id', { count: 'exact' });

    if (fetchError) throw fetchError;

    // If it's the first time and the user has no calculations, seed the templates.
    if (isInitialUserLoad.current && existingCalcs.length === 0) {
        const showcaseTemplates = DEFAULT_CALCULATIONS_SHOWCASE.map(calc => ({
            ...calc,
            user_id: currentSession.user.id
        }));
        const { error: insertError } = await supabase.from('calculations').insert(showcaseTemplates as any);
        if (insertError) {
          // Don't block the user if seeding fails, just log it.
          console.error("Failed to seed showcase calculations:", insertError);
        }
    }
    
    const [calcRes, matRes, machRes, toolRes, procRes] = await Promise.all([
      supabase.from('calculations').select('*'),
      supabase.from('materials').select('*'),
      supabase.from('machines').select('*'),
      supabase.from('tools').select('*'),
      supabase.from('processes').select('*'),
    ]);

    if (calcRes.error) throw calcRes.error;
    if (matRes.error) throw matRes.error;
    if (machRes.error) throw machRes.error;
    if (toolRes.error) throw toolRes.error;
    if (procRes.error) throw procRes.error;

    setCalculations((calcRes.data as unknown as Calculation[]) || []);
    
    const userMaterials = (matRes.data as MaterialMasterItem[]) || [];
    const combinedMaterials = [...INITIAL_MATERIALS_MASTER];
    userMaterials.forEach(um => {
      if (!INITIAL_MATERIALS_MASTER.some(dm => dm.id === um.id)) {
        combinedMaterials.push(um);
      }
    });
    setMaterials(combinedMaterials);

    const userMachines = (machRes.data as Machine[]) || [];
    const combinedMachines = [...DEFAULT_MACHINES_MASTER];
    userMachines.forEach(um => {
      if (!DEFAULT_MACHINES_MASTER.some(dm => dm.id === um.id)) {
        combinedMachines.push(um);
      }
    });
    setMachines(combinedMachines);

    const userTools = (toolRes.data as Tool[]) || [];
    const combinedTools = [...DEFAULT_TOOLS_MASTER];
    userTools.forEach(ut => {
      if (!DEFAULT_TOOLS_MASTER.some(dt => dt.id === ut.id)) {
        combinedTools.push(ut);
      }
    });
    setTools(combinedTools);

    const userProcesses = (procRes.data as Process[]) || [];
    const combinedProcesses = [...DEFAULT_PROCESSES];
    userProcesses.forEach(up => {
      if (!DEFAULT_PROCESSES.some(dp => dp.id === up.id)) {
        combinedProcesses.push(up);
      }
    });
    setProcesses(combinedProcesses);

  }, []);

  // Effect 1: Listen for auth changes and fetch public data
  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        // If user logs out, reset to the public auth page
        setCurrentView('auth');
      }
    });

    supabase.from('subscription_plans').select('*').then(({ data, error: planError }) => {
      if (planError) setError(`Error loading plans: ${planError.message}`);
      else setPlans((data as unknown as SubscriptionPlan[]) || []);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Effect 2: React to session changes to fetch the user's profile
  useEffect(() => {
    if (session === undefined) return;
    
    setLoading(true);

    if (session?.user) {
      supabase.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data, error: profileError }) => {
          if (profileError || !data) {
            console.error('Error fetching profile:', profileError);
            const message = profileError?.message ?? 'Profile not found. Please try signing in again.';
            setError(`Could not fetch user profile: ${message}`);
            supabase.auth.signOut(); 
          } else {
            setUser(data as User);
          }
        });
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [session]);

  // Effect 3: React to user changes to fetch all their data
  useEffect(() => {
    const fetchAllDataForUser = async () => {
      if (!user || !session) {
        isInitialUserLoad.current = true;
        setCalculations([]);
        setMaterials([]);
        setMachines([]);
        setTools([]);
        setProcesses([]);
        setSubscribers([]);
        return;
      }

      try {
        await fetchData(session);

        if (user.email && SUPER_ADMIN_EMAILS.includes(user.email)) {
          const { data: subscribersData, error: subscribersError } = await supabase.rpc('get_subscribers_list');
          if (subscribersError) throw subscribersError;
          setSubscribers((subscribersData as SubscriberInfo[]) || []);
        }
        
        if (isInitialUserLoad.current) {
          setCurrentView('landing');
          isInitialUserLoad.current = false;
        }
      } catch (err: any) {
        const message = err?.message ?? 'An unknown error occurred while loading data.';
        setError(`Error loading application data: ${message}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllDataForUser();
  }, [user, session, fetchData]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleUpdateUser = useCallback(async (updates: Partial<User>) => {
    const currentUserId = session?.user?.id;
    if (!currentUserId) return;
    const { data, error: updateError } = await supabase.from('profiles').update(updates).eq('id', currentUserId).select().single();
    if (updateError) {
      setError(updateError.message);
    } else if (data) {
      setUser(data as User);
    }
  }, [session]);

  const handleDeleteCalculation = useCallback(async (calculationId: string) => {
    const { error: deleteError } = await supabase.from('calculations').delete().eq('id', calculationId);
    if (deleteError) {
      setError(deleteError.message);
    } else {
      setCalculations(prev => prev.filter(c => c.id !== calculationId));
    }
  }, []);

  const handleSaveCalculation = useCallback(async (calculation: Calculation) => {
    if (!user) return;

    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email);
    const userPlan = plans.find(p => p.id === user.plan_id) || plans.find(p => p.id === 'plan_001');
    const calculationLimit = userPlan?.calculation_limit ?? 5;
    const isNewCalculation = !calculations.some(c => c.id === calculation.id);
    const lifetimeCount = user.calculations_created_this_period || 0;
    const isLimitReached = calculationLimit !== -1 && lifetimeCount >= calculationLimit;

    if (!isSuperAdmin && isNewCalculation && isLimitReached) {
      setIsUpgradeModalOpen(true);
      return;
    }

    const { data: savedCalc, error: calcError } = await supabase.from('calculations').upsert(calculation as any).select().single();

    if (calcError) {
      setError(calcError.message);
      return;
    }

    if (isNewCalculation) {
      const userUpdates = {
        calcNextNumber: (user.calcNextNumber || 101) + 1,
        calculations_created_this_period: lifetimeCount + 1,
      };
      await handleUpdateUser(userUpdates);
      setCalculations(prev => [...prev, savedCalc as unknown as Calculation]);
    } else {
      setCalculations(prev => prev.map(c => c.id === savedCalc.id ? savedCalc as unknown as Calculation : c));
    }

    setViewingCalculation(savedCalc as unknown as Calculation);
    setCurrentView('results');
    setEditingCalculation(null);
  }, [user, calculations, plans, handleUpdateUser]);

  const saveDraftLogic = useCallback(async (draftInput: MachiningInput) => {
    if (!user) return { success: false };

    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email);
    const userPlan = plans.find(p => p.id === user.plan_id) || plans.find(p => p.id === 'plan_001');
    const calculationLimit = userPlan?.calculation_limit ?? 5;
    const isNewDraft = !calculations.some(c => c.id === draftInput.id);
    const lifetimeCount = user.calculations_created_this_period || 0;
    const isLimitReached = calculationLimit !== -1 && lifetimeCount >= calculationLimit;

    if (!isSuperAdmin && isNewDraft && isLimitReached) {
        return { success: false, limitReached: true };
    }

    const draftCalculation: Calculation = {
      id: draftInput.id || new Date().toISOString(),
      inputs: draftInput,
      status: 'draft',
      user_id: user.id,
      created_at: draftInput.createdAt,
    };

    const { data: savedDraft, error: draftError } = await supabase.from('calculations').upsert(draftCalculation as any).select().single();

    if (draftError) {
      setError(draftError.message);
      return { success: false };
    }

    if (isNewDraft) {
      setCalculations(prev => [...prev, savedDraft as unknown as Calculation]);
      const userUpdates = {
        calcNextNumber: (user.calcNextNumber || 101) + 1,
        calculations_created_this_period: lifetimeCount + 1,
      };
      await handleUpdateUser(userUpdates);
    } else {
      setCalculations(prev => prev.map(c => c.id === savedDraft.id ? savedDraft as unknown as Calculation : c));
    }

    return { success: true };
}, [user, calculations, plans, handleUpdateUser]);

  const handleSaveDraft = useCallback(async (draftInput: MachiningInput) => {
      const result = await saveDraftLogic(draftInput);
      if (result.success) {
          setCurrentView('calculations');
          setEditingCalculation(null);
      } else if (result.limitReached) {
          setIsUpgradeModalOpen(true);
      }
  }, [saveDraftLogic]);

  const handleAutoSaveDraft = useCallback(async (draftInput: MachiningInput) => {
      const result = await saveDraftLogic(draftInput);
      if (result.limitReached) {
          setError("Calculation limit reached. Auto-save is paused. Please upgrade your plan.");
      }
  }, [saveDraftLogic]);
  
  const crudHandler = useCallback(async <T extends {id: string, user_id?: string, created_at?: string}>(
    action: 'add' | 'update' | 'delete',
    table: 'materials' | 'machines' | 'tools' | 'processes',
    item: T | string,
    stateSetter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    if (!user) return;
    setError(null);
    
    let response;
    if (action === 'add') {
        const { created_at, ...restOfItem } = item as T;
        const newItem = { ...restOfItem, user_id: user.id };
        response = await supabase.from(table).insert(newItem as any).select().single();
    } else if (action === 'update') {
        response = await supabase.from(table).update(item as any).eq('id', (item as T).id).select().single();
    } else { // delete
        response = await supabase.from(table).delete().eq('id', item as string);
    }

    const { data, error: crudError } = response;
    if (crudError) {
        setError(crudError.message);
        return;
    }
    
    if (action === 'add' && data) {
        stateSetter(prev => [...prev, data as unknown as T]);
    } else if (action === 'update' && data) {
        stateSetter(prev => prev.map(i => i.id === (data as any).id ? data as unknown as T : i));
    } else if (action === 'delete') {
        stateSetter(prev => prev.filter(i => i.id !== (item as string)));
    }
  }, [user]);

  const bulkDeleteHandler = useCallback(async <T extends { id: string }>(
    table: 'materials' | 'machines' | 'tools' | 'processes',
    ids: string[],
    stateSetter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    if (!user || ids.length === 0) return;
    setError(null);

    const { error: deleteError } = await supabase.from(table).delete().in('id', ids);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      stateSetter(prev => prev.filter(item => !ids.includes(item.id)));
    }
  }, [user]);

  const handleAddMaterial = (m: MaterialMasterItem) => crudHandler('add', 'materials', m, setMaterials);
  const handleUpdateMaterial = (m: MaterialMasterItem) => crudHandler('update', 'materials', m, setMaterials);
  const handleDeleteMaterial = (id: string) => crudHandler('delete', 'materials', id, setMaterials);
  const handleDeleteMultipleMaterials = (ids: string[]) => bulkDeleteHandler('materials', ids, setMaterials as any);

  const handleAddMachine = (m: Machine) => crudHandler('add', 'machines', m, setMachines);
  const handleUpdateMachine = (m: Machine) => crudHandler('update', 'machines', m, setMachines);
  const handleDeleteMachine = (id: string) => crudHandler('delete', 'machines', id, setMachines);
  const handleDeleteMultipleMachines = (ids: string[]) => bulkDeleteHandler('machines', ids, setMachines as any);

  const handleAddTool = (t: Tool) => crudHandler('add', 'tools', t, setTools);
  const handleUpdateTool = (t: Tool) => crudHandler('update', 'tools', t, setTools);
  const handleDeleteTool = (id: string) => crudHandler('delete', 'tools', id, setTools);
  const handleDeleteMultipleTools = (ids: string[]) => bulkDeleteHandler('tools', ids, setTools as any);

  const handleAddProcess = (p: Process) => crudHandler('add', 'processes', p, setProcesses);
  const handleUpdateProcess = (p: Process) => crudHandler('update', 'processes', p, setProcesses);
  const handleDeleteProcess = (id: string) => crudHandler('delete', 'processes', id, setProcesses);
  const handleDeleteMultipleProcesses = (ids: string[]) => bulkDeleteHandler('processes', ids, setProcesses as any);

  const bulkAddHandler = useCallback(async <T, U>(
    itemsToAdd: T[],
    table: 'materials' | 'machines' | 'tools' | 'processes',
    stateSetter: React.Dispatch<React.SetStateAction<U[]>>
  ) => {
    if (!user || itemsToAdd.length === 0) return;
    setError(null);

    const newItems = itemsToAdd.map(item => ({ 
        ...item, 
        id: `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        user_id: user.id 
    }));
    const { data, error: insertError } = await supabase.from(table).insert(newItems as any).select();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      stateSetter(prev => [...prev, ...data as unknown as U[]]);
    }
  }, [user]);

  const handleAddMultipleMaterials = (items: Omit<MaterialMasterItem, 'id' | 'user_id' | 'created_at'>[]) => bulkAddHandler(items, 'materials', setMaterials);
  const handleAddMultipleMachines = (items: Omit<Machine, 'id' | 'user_id' | 'created_at'>[]) => bulkAddHandler(items, 'machines', setMachines);
  const handleAddMultipleTools = (items: Omit<Tool, 'id' | 'user_id' | 'created_at'>[]) => bulkAddHandler(items, 'tools', setTools);
  const handleAddMultipleProcesses = (items: Omit<Process, 'id' | 'user_id' | 'created_at'>[]) => bulkAddHandler(items, 'processes', setProcesses);
  
  const handleAddPlan = async (p: SubscriptionPlan) => {
      const { data, error: addPlanError } = await supabase.from('subscription_plans').insert(p as any).select().single();
      if (addPlanError) setError(addPlanError.message); else if (data) setPlans(prev => [...prev, data as unknown as SubscriptionPlan]);
  };
  const handleUpdatePlan = async (p: SubscriptionPlan) => {
      const { data, error: updatePlanError } = await supabase.from('subscription_plans').update(p as any).eq('id', p.id).select().single();
      if (updatePlanError) setError(updatePlanError.message); else if (data) setPlans(prev => prev.map(plan => plan.id === p.id ? data as unknown as SubscriptionPlan : plan));
  };
  const handleDeletePlan = async (id: string) => {
      const { error: deletePlanError } = await supabase.from('subscription_plans').delete().eq('id', id);
      if (deletePlanError) setError(deletePlanError.message); else setPlans(prev => prev.filter(p => p.id !== id));
  };

  const handleUpgradePlan = async (planId: string) => {
    if (!user) return;
    await handleUpdateUser({
        plan_id: planId,
        subscription_status: 'active',
        calculations_created_this_period: 0,
    });
    setCurrentView('calculations');
  };

  const handleFeedbackSubmit = useCallback(async (feedbackData: Omit<Feedback, 'id' | 'user_id' | 'user_email' | 'created_at'>) => {
    if (!user) {
      throw new Error("You must be logged in to submit feedback.");
    }
    setError(null);

    const feedbackToInsert = {
      ...feedbackData,
      user_id: user.id,
      user_email: user.email,
    };
    
    // In a real app, you'd check if a 'feedback' table exists in types/supabase.ts
    // For now, we cast to 'any' to bypass strict checks for this new, untyped table.
    const { error: insertError } = await supabase.from('feedback' as any).insert(feedbackToInsert);

    if (insertError) {
      const errorMessage = `Failed to submit feedback: ${insertError.message}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [user]);

  const handleNavigate = (view: View) => {
    if (view === 'calculator') setEditingCalculation(null);
    setCurrentView(view);
  };
  
  const handleEdit = (c: Calculation) => {
    setEditingCalculation(c);
    setCurrentView('calculator');
  }

  const handleViewResults = (c: Calculation) => {
    setViewingCalculation(c);
    setCurrentView('results');
  }

  const renderAuthenticatedContent = () => {
    if (!user) return null;

    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email);
    const userPlan = plans.find(p => p.id === user.plan_id) || plans.find(p => p.id === 'plan_001');

    switch (currentView) {
      case 'landing':
        return <LandingPage onNavigate={handleNavigate} userName={user.name} />;
      case 'calculations':
        return <DashboardPage user={user} calculations={calculations} onNavigate={handleNavigate} onEdit={handleEdit} onDelete={handleDeleteCalculation} onViewResults={handleViewResults} userPlan={userPlan} onUpgrade={() => setIsUpgradeModalOpen(true)} isSuperAdmin={isSuperAdmin} theme={theme} />;
      case 'calculator':
        return <CalculatorPage user={user} materials={materials} machines={machines} processes={processes} tools={tools} onSave={handleSaveCalculation} onSaveDraft={handleSaveDraft} onAutoSaveDraft={handleAutoSaveDraft} onBack={() => setCurrentView('calculations')} existingCalculation={editingCalculation} />;
      case 'results':
        return <ResultsPage user={user} calculation={viewingCalculation} onBack={() => setCurrentView('calculations')} />;
      case 'materials':
        return <MaterialsPage materials={materials} onAddMaterial={handleAddMaterial} onUpdateMaterial={handleUpdateMaterial} onDeleteMaterial={handleDeleteMaterial} onAddMultipleMaterials={handleAddMultipleMaterials} onDeleteMultipleMaterials={handleDeleteMultipleMaterials} user={user} />;
      case 'machines':
        return <MachineLibraryPage machines={machines} onAddMachine={handleAddMachine} onUpdateMachine={handleUpdateMachine} onDeleteMachine={handleDeleteMachine} onAddMultipleMachines={handleAddMultipleMachines} onDeleteMultipleMachines={handleDeleteMultipleMachines} user={user} />;
      case 'processes':
        return <ProcessLibraryPage processes={processes} user={user} onAddProcess={handleAddProcess} onUpdateProcess={handleUpdateProcess} onDeleteProcess={handleDeleteProcess} onAddMultipleProcesses={handleAddMultipleProcesses} onDeleteMultipleProcesses={handleDeleteMultipleProcesses} />;
      case 'toolLibrary':
        return <ToolLibraryPage user={user} tools={tools} onAddTool={handleAddTool} onUpdateTool={handleUpdateTool} onDeleteTool={handleDeleteTool} onAddMultipleTools={handleAddMultipleTools} onDeleteMultipleTools={handleDeleteMultipleTools} />;
      case 'settings':
        return <SettingsPage user={user} onUpdateUser={handleUpdateUser} />;
      case 'subscription':
        return <SubscriptionPage plans={plans} user={user} isSuperAdmin={isSuperAdmin} onUpgradePlan={handleUpgradePlan} />;
      case 'feedback':
        return <FeedbackPage user={user} onSubmit={handleFeedbackSubmit} />;
      case 'superadmin':
        return isSuperAdmin ? <SuperAdminPage plans={plans} onAddPlan={handleAddPlan} onUpdatePlan={handleUpdatePlan} onDeletePlan={handleDeletePlan} /> : <DashboardPage user={user} calculations={calculations} onNavigate={handleNavigate} onEdit={handleEdit} onDelete={handleDeleteCalculation} onViewResults={handleViewResults} userPlan={userPlan} onUpgrade={() => setIsUpgradeModalOpen(true)} isSuperAdmin={isSuperAdmin} theme={theme} />;
      case 'subscribersList':
        return isSuperAdmin ? <UserManagementPage subscribers={subscribers} theme={theme} /> : <DashboardPage user={user} calculations={calculations} onNavigate={handleNavigate} onEdit={handleEdit} onDelete={handleDeleteCalculation} onViewResults={handleViewResults} userPlan={userPlan} onUpgrade={() => setIsUpgradeModalOpen(true)} isSuperAdmin={isSuperAdmin} theme={theme} />;
      default:
        return <LandingPage onNavigate={handleNavigate} userName={user.name} />;
    }
  };
  
  const renderPublicContent = () => {
    // The only public view is the authentication page.
    return <AuthPage />;
  };

  if (loading || session === undefined) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {error && <div className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">{error}</div>}
      {isUpgradeModalOpen && user && <SubscriptionUpgradeModal onClose={() => setIsUpgradeModalOpen(false)} onNavigate={() => { setIsUpgradeModalOpen(false); handleNavigate('subscription'); }} />}

      {!session || !user ? (
        <PublicLayout theme={theme} setTheme={setTheme}>
            {renderPublicContent()}
        </PublicLayout>
      ) : (
        <MainLayout user={user} currentView={currentView} onNavigate={handleNavigate} onLogout={handleLogout} editingCalculation={editingCalculation} theme={theme} setTheme={setTheme}>
            {renderAuthenticatedContent()}
        </MainLayout>
      )}
    </>
  );
};

export default App;
