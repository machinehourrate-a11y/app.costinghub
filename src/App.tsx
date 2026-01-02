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
import { SubscriptionPage } from './pages/SubscriptionPage';
import { OAuthConsentPage } from './pages/OAuthConsentPage';
import { SubscriptionUpgradeModal } from './components/SubscriptionUpgradeModal';
import type { User, Calculation, MaterialMasterItem, Machine, Process, View, Tool, SubscriberInfo, Feedback, RegionCost, RegionCurrencyMap, MachiningInput, CalculatorHeaderInfo, CalculationShare, Setup } from './types';
import { SUPER_ADMIN_EMAILS, INITIAL_INPUT } from './constants';

declare global {
  interface Window {
    mixpanel: any;
    html2pdf: any;
  }
}

const uuid = () => crypto.randomUUID();

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [materials, setMaterials] = useState<MaterialMasterItem[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberInfo[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [countryCosts, setCountryCosts] = useState<RegionCost[]>([]);
  const [countryCurrencyMap, setCountryCurrencyMap] = useState<RegionCurrencyMap[]>([]);
  
  const [currentView, setCurrentView] = useState<View>(() => {
    const path = window.location.pathname;
    if (path === '/signup' || path === '/login') return 'auth';
    if (path === '/reset-password') return 'resetPassword';
    if (path === '/oauth/consent') return 'oauthConsent';
    return 'auth'; 
  });

  const [editingCalculation, setEditingCalculation] = useState<Calculation | null>(null);
  const [viewingCalculation, setViewingCalculation] = useState<Calculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);
  const [calculatorHeaderInfo, setCalculatorHeaderInfo] = useState<CalculatorHeaderInfo>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  
  const isInRecoveryFlow = useRef(false);
  const hasInitializedView = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Mixpanel User Identification
  useEffect(() => {
    if (user && window.mixpanel) {
      window.mixpanel.identify(user.id);
      window.mixpanel.people.set({
        '$email': user.email,
        '$name': user.name,
        'Company Name': user.companyName,
        'Plan': user.plan_name,
        'Subscription Status': user.subscription_status,
      });
    }
  }, [user]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/login' || path === '/signup') {
        if (!session) setCurrentView('auth');
      } else if (path === '/reset-password') {
        setCurrentView('resetPassword');
      } else if (path === '/oauth/consent') {
        setCurrentView('oauthConsent');
      } else if (session) {
        if (path === '/') setCurrentView('landing');
        else if (path === '/settings') setCurrentView('settings');
        else if (path === '/calculations') setCurrentView('calculations');
        else if (path === '/materials') setCurrentView('materials');
        else if (path === '/machines') setCurrentView('machines');
        else if (path === '/processes') setCurrentView('processes');
        else if (path === '/calculator') setCurrentView('calculator');
        else if (path === '/results') setCurrentView('results');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [session]);

  const fetchData = useCallback(async (currentSession: Session) => {
    if (!currentSession.user || !currentSession.user.email) return;
    const userEmail = currentSession.user.email;

    try {
      const isCurrentUserSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmail.toLowerCase());

      const [calcRes, matRes, machRes, toolRes, allProcRes, regionCostRes, regionCurrencyRes, profileRes] = await Promise.all([
        supabase.from('calculations').select('*').eq('user_id', currentSession.user.id),
        supabase.from('materials').select('*').eq('user_id', currentSession.user.id),
        supabase.from('machines').select('*').eq('user_id', currentSession.user.id),
        supabase.from('tools').select('*').eq('user_id', currentSession.user.id),
        supabase.from('processes').select('*').or(`user_id.eq.${currentSession.user.id},user_id.is.null`),
        supabase.from('region_costs').select('*').eq('user_id', currentSession.user.id),
        supabase.from('region_currency_map').select('*').or(`user_id.eq.${currentSession.user.id},user_id.is.null`),
        supabase.from('profiles').select('*').eq('id', currentSession.user.id).single(),
      ]);

      setCalculations((calcRes.data as any[]) || []);
      setMaterials((matRes.data as any[]) || []);
      setMachines((machRes.data as any[]) || []);
      setTools((toolRes.data as any[]) || []);
      setProcesses((allProcRes.data as Process[]) || []);
      setCountryCurrencyMap(regionCurrencyRes.data || []);
      setCountryCosts(regionCostRes.data || []);
      
      if (profileRes.data) {
        // Map the database response to the User type, ensuring features is an object
        const dbUser = profileRes.data as any;
        setUser({ 
            ...dbUser, 
            email: currentSession.user.email!,
            features: dbUser.features || {}, // Ensure features is always an object
        } as User);
      }

      if (isCurrentUserSuperAdmin) {
          const { data: subsData } = await supabase.rpc('get_subscribers_list');
          if (subsData) setSubscribers(subsData as SubscriberInfo[]);
          const { data: feedbackData } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
          if (feedbackData) setFeedbacks(feedbackData || []);
      }

    } catch (e: any) {
        console.error("An error occurred during data fetch.", e);
        setError(`Failed to load application data: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
        isInRecoveryFlow.current = true;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') isInRecoveryFlow.current = true;
      if (session && isInRecoveryFlow.current) {
          setSession(session);
          try { window.history.pushState({}, '', '/reset-password'); } catch (e) {}
          setCurrentView('resetPassword');
          setLoading(false);
          return;
      }
      
      if (session) {
        if (_event === 'SIGNED_IN' && window.mixpanel) {
          window.mixpanel.track('Logged In');
        }
        setSession(session);
        setLoading(true);
        fetchData(session).finally(() => {
          if (!hasInitializedView.current) {
            const path = window.location.pathname;
            if (path === '/login' || path === '/signup') {
                try { window.history.replaceState({}, '', '/'); } catch (e) {}
                setCurrentView('landing');
            } else {
                if (path === '/') setCurrentView('landing');
                else if (path === '/settings') setCurrentView('settings');
                else if (path === '/calculations') setCurrentView('calculations');
                else if (path === '/materials') setCurrentView('materials');
                else if (path === '/machines') setCurrentView('machines');
                else if (path === '/processes') setCurrentView('processes');
                else if (path === '/calculator') setCurrentView('calculator');
                else if (path === '/results') setCurrentView('results');
                else if (path === '/oauth/consent') setCurrentView('oauthConsent');
                else setCurrentView('landing');
            }
            hasInitializedView.current = true;
          }
          setLoading(false);
        });
        return;
      }

      hasInitializedView.current = false;
      isInRecoveryFlow.current = false;
      if (window.mixpanel) {
        window.mixpanel.reset();
      }
      setSession(null);
      setUser(null);
      setCalculations([]);
      const currentPath = window.location.pathname;
      if (currentPath !== '/signup' && currentPath !== '/login' && currentPath !== '/reset-password' && currentPath !== '/oauth/consent') {
        try { window.history.replaceState({}, '', '/login'); } catch (e) {}
      }
      setCurrentView('auth');
      setLoading(false);
    });
    return () => subscription?.unsubscribe();
  }, [fetchData]);

  const handleNavigation = useCallback((view: View) => {
    if (view !== 'calculator' && view !== 'results') {
        setEditingCalculation(null);
        setViewingCalculation(null);
    }
    
    let path = '/';
    switch (view) {
        case 'auth': path = '/login'; break;
        case 'landing': path = '/'; break;
        case 'settings': path = '/settings'; break;
        case 'calculations': path = '/calculations'; break;
        case 'materials': path = '/materials'; break;
        case 'machines': path = '/machines'; break;
        case 'processes': path = '/processes'; break;
        case 'toolLibrary': path = '/tools'; break;
        case 'costMaster': path = '/costs'; break;
        case 'subscription': path = '/subscription'; break;
        case 'results': path = '/results'; break;
        case 'calculator': path = '/calculator'; break;
        case 'oauthConsent': path = '/oauth/consent'; break;
        default: path = window.location.pathname;
    }
    
    if (path !== window.location.pathname) {
        try { window.history.pushState({}, '', path); } catch (e) {}
    }
    if (window.mixpanel) {
        window.mixpanel.track('View Changed', { view: view });
    }
    setCurrentView(view);
  }, []);
  
  const handleUpdateUser = useCallback(async (updatedUser: Partial<User>) => {
    if (!user) return;
    const { data, error } = await supabase.from('profiles').update(updatedUser as any).eq('id', user.id).select();
    if (error) setError(error.message);
    else if (data) setUser(prev => ({ ...prev!, ...data[0] }));
  }, [user]);

  const handleAutoSaveCalculation = useCallback(async (calculation: Calculation) => {
    if (!user) return;
    const { data, error } = await supabase.from('calculations').upsert(calculation as any).select();
    if (data) {
      const savedCalc = data[0] as unknown as Calculation;
      setCalculations(prev => [...prev.filter(c => c.id !== calculation.id), savedCalc]);
      if (editingCalculation?.id === calculation.id) {
          setEditingCalculation(savedCalc);
      }
    }
  }, [user, editingCalculation]);

  const handleSaveCalculationFinal = useCallback(async (calculation: Calculation) => {
    if (!user) return;
    const { data, error } = await supabase.from('calculations').upsert(calculation as any).select();
    if (error) {
        setError(error.message);
    } else if (data) {
      if (window.mixpanel) {
          window.mixpanel.track('Calculation Saved', {
              calculationId: calculation.id,
              status: calculation.status,
              partName: calculation.inputs.partName
          });
      }
      const savedCalc = data[0] as unknown as Calculation;
      setCalculations(prev => [...prev.filter(c => c.id !== calculation.id), savedCalc]);
      setViewingCalculation(savedCalc);
      handleNavigation('results');
    }
  }, [user, handleNavigation]);

  const handleSaveCalculationDraft = useCallback(async (calculation: Calculation) => {
    if (!user) return;
    const { data, error } = await supabase.from('calculations').upsert(calculation as any).select();
    if (error) {
        setError(error.message);
    } else if (data) {
      const savedCalc = data[0] as unknown as Calculation;
      setCalculations(prev => [...prev.filter(c => c.id !== calculation.id), savedCalc]);
      handleNavigation('calculations'); 
    }
  }, [user, handleNavigation]);

  const crudHandler = useCallback(async (table: 'materials' | 'machines' | 'processes' | 'tools' | 'region_costs', action: 'add' | 'update' | 'delete' | 'add_multiple' | 'delete_multiple', payload: any, stateSetter: React.Dispatch<React.SetStateAction<any[]>>) => {
    if (!user) return;
    let result;
    if (action === 'add') {
      result = await supabase.from(table).insert({ ...payload, id: uuid(), user_id: user.id } as any).select();
      if (!result.error && result.data) {
        stateSetter(prev => [...prev, result.data[0]]);
      }
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
    if (result && result.error) setError(result.error.message);
  }, [user]);

  const handleAddCountryCurrency = useCallback(async (map: { country: string, currency: string }) => {
    if (!user) return;
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
    const payload = {
        region: map.country,
        currency: map.currency,
        user_id: isSuperAdmin ? null : user.id,
    };
    const { data, error } = await supabase.from('region_currency_map').insert(payload as any).select();
    if (error) {
        setError(error.message);
        throw error;
    }
    if (data) {
        setCountryCurrencyMap(prev => [...prev, data[0]]);
    }
  }, [user]);

  const handleDeleteCountryCurrency = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('region_currency_map').delete().eq('id', id);
    if (error) {
        setError(error.message);
        throw error;
    }
    setCountryCurrencyMap(prev => prev.filter(rcm => rcm.id !== id));
  }, [user]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  if (currentView === 'resetPassword') {
    return (
      <PublicLayout theme={theme} setTheme={setTheme}>
        <ResetPasswordPage onPasswordReset={async () => {
          try { window.history.replaceState(null, '', '/login'); } catch (e) {}
          isInRecoveryFlow.current = false;
          setAuthSuccessMessage("Your password has been reset successfully! Please log in.");
          await supabase.auth.signOut();
        }} />
      </PublicLayout>
    );
  }

  if (currentView === 'oauthConsent') {
    return (
      <PublicLayout theme={theme} setTheme={setTheme}>
        <OAuthConsentPage />
      </PublicLayout>
    );
  }

  if (!session || !user) {
    return (
       <AuthPage successMessage={authSuccessMessage} setSuccessMessage={setAuthSuccessMessage} />
    );
  }

  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
  const onUpgrade = () => setIsUpgradeModalOpen(true);

  let content;
  switch (currentView) {
    case 'landing': content = <LandingPage onNavigate={handleNavigation} user={user} />; break;
    case 'calculations': content = <DashboardPage user={user} calculations={calculations} onNavigate={handleNavigation} onEdit={(calc) => { setEditingCalculation(calc); handleNavigation('calculator'); }} onDelete={(id) => supabase.from('calculations').delete().eq('id', id).then(() => setCalculations(prev => prev.filter(c => c.id !== id)))} onViewResults={(calc) => { setViewingCalculation(calc); handleNavigation('results'); }} onUpgrade={onUpgrade} isSuperAdmin={isSuperAdmin} theme={theme} />; break;
    case 'calculator': content = <CalculatorPage user={user} materials={materials} machines={machines} processes={processes} tools={tools} countryCosts={countryCosts} countryCurrencyMap={countryCurrencyMap} onSave={handleSaveCalculationFinal} onSaveDraft={handleSaveCalculationDraft} onAutoSaveDraft={handleAutoSaveCalculation} onBack={() => handleNavigation('calculations')} existingCalculation={editingCalculation} theme={theme} onNavigate={handleNavigation} onHeaderInfoChange={setCalculatorHeaderInfo} onAddTool={(t) => crudHandler('tools', 'add', t, setTools)} onShare={async () => {}} onRevokeShare={async () => {}} onGetShares={async () => []} />; break;
    case 'results': content = <ResultsPage user={user} calculation={viewingCalculation} onBack={() => handleNavigation('calculations')} onUpgrade={onUpgrade} />; break;
    case 'settings': content = <SettingsPage user={user} session={session} onUpdateUser={handleUpdateUser} onNavigate={handleNavigation} isSuperAdmin={isSuperAdmin} />; break;
    case 'subscribersList': content = <UserManagementPage subscribers={subscribers} theme={theme} onUpdateUser={(id, updates) => supabase.from('profiles').update(updates as any).eq('id', id).then(() => fetchData(session!))} onSendRecovery={async (email) => {}} onSendConfirmation={async (email) => {}} />; break;
    case 'superadmin': content = <SuperAdminPage onNavigate={handleNavigation} />; break;
    case 'feedbackList': content = <FeedbackListPage feedbacks={feedbacks} />; break;
    case 'subscription': content = <SubscriptionPage user={user} onBack={() => handleNavigation('settings')} />; break;
    case 'materials': content = <MaterialsPage materials={materials} user={user} onAddMaterial={(mat) => crudHandler('materials', 'add', mat, setMaterials)} onUpdateMaterial={(mat) => crudHandler('materials', 'update', mat, setMaterials)} onDeleteMaterial={(id) => crudHandler('materials', 'delete', id, setMaterials)} onAddMultipleMaterials={(mats) => crudHandler('materials', 'add_multiple', mats, setMaterials)} onDeleteMultipleMaterials={(ids) => crudHandler('materials', 'delete_multiple', ids, setMaterials)} />; break;
    case 'machines': content = <MachineLibraryPage machines={machines} user={user} onAddMachine={(mach) => crudHandler('machines', 'add', mach, setMachines)} onUpdateMachine={(mach) => crudHandler('machines', 'update', mach, setMachines)} onDeleteMachine={(id) => crudHandler('machines', 'delete', id, setMachines)} onAddMultipleMachines={(machs) => crudHandler('machines', 'add_multiple', machs, setMachines)} onDeleteMultipleMachines={(ids) => crudHandler('machines', 'delete_multiple', ids, setMachines)} />; break;
    case 'processes': content = <ProcessLibraryPage processes={processes} user={user} onAddProcess={(proc) => crudHandler('processes', 'add', proc, setProcesses)} onUpdateProcess={(proc) => crudHandler('processes', 'update', proc, setProcesses)} onDeleteProcess={(id) => crudHandler('processes', 'delete', id, setProcesses)} onAddMultipleProcesses={(procs) => crudHandler('processes', 'add_multiple', procs, setProcesses)} onDeleteMultipleProcesses={(ids) => crudHandler('processes', 'delete_multiple', ids, setProcesses)} />; break;
    case 'toolLibrary': content = <ToolLibraryPage tools={tools} user={user} onAddTool={(tool) => crudHandler('tools', 'add', tool, setTools)} onUpdateTool={(tool) => crudHandler('tools', 'update', tool, setTools)} onDeleteTool={(id) => crudHandler('tools', 'delete', id, setTools)} onAddMultipleTools={(tls) => crudHandler('tools', 'add_multiple', tls, setTools)} onDeleteMultipleTools={(ids) => crudHandler('tools', 'delete_multiple', ids, setTools)} />; break;
    case 'costMaster': content = <CostMasterPage materials={materials} machines={machines} tools={tools} countryCosts={countryCosts} countryCurrencyMap={countryCurrencyMap} user={user} onUpdateMaterial={(mat) => crudHandler('materials', 'update', mat, setMaterials)} onUpdateMachine={(mach) => crudHandler('machines', 'update', mach, setMachines)} onUpdateTool={(tool) => crudHandler('tools', 'update', tool, setTools)} onAddRegionCost={(cost) => crudHandler('region_costs', 'add', cost, setCountryCosts)} onUpdateRegionCost={(cost) => crudHandler('region_costs', 'update', cost, setCountryCosts)} onDeleteRegionCost={(id) => crudHandler('region_costs', 'delete', id, setCountryCosts)} onAddCountryCurrency={handleAddCountryCurrency} onDeleteCountryCurrency={handleDeleteCountryCurrency} />; break;
    case 'feedback': content = <FeedbackPage user={user} onSubmit={async () => {}} />; break;
    default: content = <LandingPage onNavigate={handleNavigation} user={user!} />;
  }

  return (
    <MainLayout 
        user={user} 
        session={session}
        currentView={currentView} 
        onNavigate={handleNavigation} 
        onLogout={() => {
          if (window.mixpanel) {
            window.mixpanel.track('Logged Out');
          }
          supabase.auth.signOut();
        }} 
        editingCalculation={editingCalculation}
        calculatorHeaderInfo={calculatorHeaderInfo}
        theme={theme} 
        setTheme={setTheme}
    >
      {isUpgradeModalOpen && <SubscriptionUpgradeModal onClose={() => setIsUpgradeModalOpen(false)} />}
      {content}
    </MainLayout>
  );
};

export default App;
