
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabaseClient';

// Fix: Declared global mixpanel type to resolve TS errors
declare global {
  interface Window {
    mixpanel: any;
  }
}

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
    setIsLogin(window.location.pathname !== '/signup');
  }, []);

  const clearMessages = () => {
    if (setSuccessMessage) setSuccessMessage(null);
    setError('');
    setResetMessage('');
  }
  
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
          setError(error.message);
      }
    } else {
      if (!name || name.trim() === '') {
        setError('Please enter your full name.');
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
          },
        }
      });
      
      if (error) {
        setError(error.message);
      } else if (data.user) {
        if (window.mixpanel) {
          window.mixpanel.track('Signed Up', { method: 'Email' });
        }
        setIsSignedUp(true);
      }
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
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) {
        setError(error.message);
    } else {
        setResetMessage("Password reset link sent! Please check your email.");
    }
  };

  const handleGoogleSignIn = async () => {
    clearMessages();
    setLoading(true);
    if (window.mixpanel) {
      window.mixpanel.track('Login Attempted', { method: 'Google' });
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    const nextMode = !isLogin;
    setIsLogin(nextMode);
    clearMessages();
    try {
      window.history.pushState({}, '', nextMode ? '/login' : '/signup');
    } catch (e) {}
  };

  return (
    <div className="w-full max-w-md mx-auto py-12 md:py-24 animate-fade-in">
      {isSignedUp ? (
        <Card className="text-center animate-fade-in-up">
          <h2 className="text-2xl font-bold text-primary mb-4">Confirm Your Email</h2>
          <p className="text-text-secondary mb-6">A confirmation email has been sent to <span className="font-semibold text-text-primary">{email}</span>. Please check your inbox to activate your account.</p>
          <Button variant="secondary" onClick={() => { 
            setIsLogin(true); 
            setIsSignedUp(false);
            try { window.history.pushState({}, '', '/login'); } catch (e) {}
          }}>Return to Login</Button>
        </Card>
      ) : (
        <Card className="transform transition-all duration-500 hover:shadow-glow-primary hover:scale-[1.01] animate-fade-in-up">
          <div className="text-center">
              <h1 className="text-3xl font-bold text-primary mb-2">
                  {isLogin ? 'Welcome Back!' : 'Create an Account'}
              </h1>
              <p className="text-text-secondary mb-8">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button onClick={toggleAuthMode} className="font-medium text-primary hover:underline focus:outline-none transition-colors">
                  {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
              </p>
          </div>
          
          {successMessage && <p className="text-green-500 text-sm text-center mb-4 animate-fade-in">{successMessage}</p>}
          {resetMessage && <p className="text-green-500 text-sm text-center mb-4 animate-fade-in">{resetMessage}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="animate-fade-in-up delay-100">
                <Input label="Full Name" type="text" name="name" value={name} onChange={handleNameChange} required disabled={loading}/>
              </div>
            )}
            <div className="animate-fade-in-up delay-200">
                <Input label="Email Address" type="email" name="email" value={email} onChange={handleEmailChange} required disabled={loading}/>
            </div>
            <div className="animate-fade-in-up delay-300">
                <Input label="Password" type="password" name="password" value={password} onChange={handlePasswordChange} required disabled={loading}/>
            </div>
            
            {isLogin && (
              <div className="text-right animate-fade-in">
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline focus:outline-none"
                  onClick={handlePasswordReset}
                  disabled={loading}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {error && <p className="text-red-500 text-sm text-center pt-2 animate-fade-in">{error}</p>}
            
            <Button type="submit" className="w-full !mt-6 animate-fade-in-up delay-300" disabled={loading}>
              {loading ? (isLogin ? 'Signing In...' : 'Signing Up...') : (isLogin ? 'Sign In' : 'Sign Up')}
            </Button>
          </form>

          <div className="relative my-6 animate-fade-in delay-200">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="bg-surface px-2 text-text-muted">
                OR
                </span>
            </div>
          </div>

          <div className="animate-fade-in-up delay-300">
            <Button
                variant="secondary"
                className="w-full flex items-center justify-center transition-transform hover:scale-105"
                onClick={handleGoogleSignIn}
                disabled={loading}
            >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
                    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.569-3.108-11.283-7.481l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.494 44 30.861 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
                </svg>
                Sign in with Google
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
