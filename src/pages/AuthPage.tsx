
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabaseClient';

interface AuthPageProps {
  successMessage?: string | null;
  setSuccessMessage?: (message: string | null) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ successMessage, setSuccessMessage }) => {
  const [isLogin, setIsLogin] = useState(window.location.pathname !== '/signup');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    const path = window.location.pathname;
    setIsLogin(path !== '/signup');
  }, []);
  
  const clearMessages = () => {
    if (setSuccessMessage) setSuccessMessage(null);
    setError('');
    setResetMessage('');
  }
  
  const handleToggleMode = () => {
    const newIsLogin = !isLogin;
    setIsLogin(newIsLogin);
    clearMessages();
    window.history.pushState({}, '', newIsLogin ? '/login' : '/signup');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearMessages();
    setName(e.target.value);
  };
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearMessages();
    setEmail(e.target.value);
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearMessages();
    setPassword(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      if (!name.trim()) {
        setError('Please enter your full name.');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name.trim() } }
      });
      if (error) setError(error.message);
      else if (data.user) setIsSignedUp(true);
    }
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!email) {
        setError("Please enter your email address to reset your password.");
        return;
    }
    clearMessages();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setLoading(false);
    if (error) setError(error.message);
    else setResetMessage("Check your inbox for the reset link!");
  };

  const handleGoogleSignIn = async () => {
    clearMessages();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-surface">
      {/* Left Content Column (Hero) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0A0A0B]">
        <img 
          src="https://images.unsplash.com/photo-1565173153926-830b205362ba?auto=format&fit=crop&q=80&w=2000" 
          alt="Manufacturing Future" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-transparent"></div>
        
        <div className="relative z-10 p-16 flex flex-col justify-between w-full">
            <div>
                 <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-glow-primary">
                        <svg className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <span className="text-2xl font-black text-white tracking-tight">CostingHub</span>
                </div>
                
                <h2 className="text-5xl font-black text-white leading-tight mb-6 max-w-lg">
                    The precision engine for <span className="text-primary italic">modern</span> manufacturing.
                </h2>
                <p className="text-xl text-gray-400 max-w-md leading-relaxed">
                    Automate cycle times, manage material libraries, and generate professional quotes in seconds.
                </p>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-4 text-white/80">
                    <div className="w-12 h-px bg-primary"></div>
                    <span className="text-sm font-bold uppercase tracking-widest">Industry Standard</span>
                </div>
                <div className="flex gap-8 opacity-50">
                    <span className="text-white font-bold text-lg">ISO 9001</span>
                    <span className="text-white font-bold text-lg">AS9100</span>
                    <span className="text-white font-bold text-lg">GD&T</span>
                </div>
            </div>
        </div>
      </div>

      {/* Right Content Column (Form) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-background">
        <div className="w-full max-w-sm">
            {isSignedUp ? (
                <div className="text-center animate-fade-in">
                    <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-2xl font-black text-text-primary mb-3">Activate Workspace</h2>
                    <p className="text-text-secondary mb-8 leading-relaxed">
                        We've sent a magic link to <span className="font-bold text-text-primary">{email}</span>. Please verify your email to continue.
                    </p>
                    <Button onClick={() => { setIsLogin(true); setIsSignedUp(false); window.history.pushState({}, '', '/login'); }} variant="secondary" className="w-full py-3">Return to Login</Button>
                </div>
            ) : (
                <div className="animate-fade-in">
                    <div className="lg:hidden flex items-center gap-2 mb-12">
                        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                            <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                        </div>
                        <span className="text-lg font-black text-text-primary tracking-tighter">CostingHub</span>
                    </div>

                    <div className="mb-10">
                        <h1 className="text-3xl font-black text-text-primary tracking-tight mb-2">
                            {isLogin ? 'Sign in to Hub' : 'Join the Force'}
                        </h1>
                        <p className="text-text-secondary font-medium">
                            {isLogin ? 'Enter your credentials to access your production data.' : 'Create your professional manufacturing account.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <Input label="Full Name" type="text" value={name} onChange={handleNameChange} placeholder="John Doe" required disabled={loading}/>
                        )}
                        <Input label="Email Address" type="email" value={email} onChange={handleEmailChange} placeholder="name@company.com" required disabled={loading}/>
                        <Input label="Password" type="password" value={password} onChange={handlePasswordChange} placeholder="••••••••" required disabled={loading}/>
                        
                        {isLogin && (
                            <div className="flex justify-end">
                                <button type="button" onClick={handlePasswordReset} className="text-xs font-bold text-primary hover:underline">Reset Password</button>
                            </div>
                        )}

                        {error && <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold text-center">{error}</div>}
                        {successMessage && <div className="p-3 rounded bg-green-500/10 border border-green-500/20 text-green-600 text-xs font-bold text-center">{successMessage}</div>}
                        {resetMessage && <div className="p-3 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-bold text-center">{resetMessage}</div>}
                        
                        <Button type="submit" className="w-full !py-3.5 shadow-glow-primary font-black uppercase tracking-widest text-xs" disabled={loading}>
                            {loading ? 'Processing...' : (isLogin ? 'Enter Hub' : 'Create Workspace')}
                        </Button>
                    </form>

                    <div className="relative my-10">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em]"><span className="bg-background px-4 text-text-muted">Federated Login</span></div>
                    </div>

                    <Button 
                        variant="secondary" 
                        className="w-full flex items-center justify-center !py-3 bg-surface hover:bg-background border-border" 
                        onClick={handleGoogleSignIn} 
                        disabled={loading}
                    >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        Google Account
                    </Button>

                    <p className="mt-12 text-center text-sm text-text-secondary font-medium">
                        {isLogin ? "New to the hub?" : "Already standard user?"}
                        <button onClick={handleToggleMode} className="ml-2 font-black text-primary hover:underline uppercase tracking-tight">
                            {isLogin ? 'Create Account' : 'Sign in'}
                        </button>
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
