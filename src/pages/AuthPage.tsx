import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabaseClient';

interface AuthPageProps {
  successMessage?: string | null;
  setSuccessMessage?: (message: string | null) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ successMessage, setSuccessMessage }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  
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
      // FIX: `signInWithPassword` is from Supabase v2. The errors suggest an older API version, so we use `signIn`.
      const { error } = await supabase.auth.signIn({
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
      // FIX: The `signUp` method signature in older versions takes two arguments.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      }, {
        data: {
          name: name.trim(),
        },
      });
      if (error) {
        setError(error.message);
      } else if (data.user) {
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
    // FIX: `resetPasswordForEmail` is on the `api` object in older versions of the SDK.
    const { error } = await supabase.auth.api.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) {
        setError(error.message);
    } else {
        setResetMessage("Password reset link sent! Please check your email.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-12 md:py-24 animate-fade-in">
      {isSignedUp ? (
        <Card className="text-center animate-fade-in">
          <h2 className="text-2xl font-bold text-primary mb-4">Confirm Your Email</h2>
          <p className="text-text-secondary mb-6">A confirmation email has been sent to <span className="font-semibold text-text-primary">{email}</span>. Please check your inbox to activate your account.</p>
        </Card>
      ) : (
        <Card>
          <div className="text-center">
              <h1 className="text-3xl font-bold text-primary mb-2">
                  {isLogin ? 'Welcome Back!' : 'Create an Account'}
              </h1>
              <p className="text-text-secondary mb-8">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button onClick={() => { setIsLogin(!isLogin); clearMessages(); }} className="font-medium text-primary hover:underline focus:outline-none">
                  {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
              </p>
          </div>
          
          {successMessage && <p className="text-green-500 text-sm text-center mb-4">{successMessage}</p>}
          {resetMessage && <p className="text-green-500 text-sm text-center mb-4">{resetMessage}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input label="Full Name" type="text" name="name" value={name} onChange={handleNameChange} required disabled={loading}/>
            )}
            <Input label="Email Address" type="email" name="email" value={email} onChange={handleEmailChange} required disabled={loading}/>
            <Input label="Password" type="password" name="password" value={password} onChange={handlePasswordChange} required disabled={loading}/>
            
            {isLogin && (
              <div className="text-right">
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

            {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
            
            <Button type="submit" className="w-full !mt-6" disabled={loading}>
              {loading ? (isLogin ? 'Signing In...' : 'Signing Up...') : (isLogin ? 'Sign In' : 'Sign Up')}
            </Button>
            
          </form>
        </Card>
      )}
    </div>
  );
};
