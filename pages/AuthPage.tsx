import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabaseClient';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
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
                  <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-primary hover:underline focus:outline-none">
                  {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
              </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input label="Full Name" type="text" name="name" value={name} onChange={e => setName(e.target.value)} required disabled={loading}/>
            )}
            <Input label="Email Address" type="email" name="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading}/>
            <Input label="Password" type="password" name="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading}/>
            
            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline focus:outline-none"
                  onClick={async () => {
                      if (!email) return alert("Please enter your email address first.");
                      const { error } = await supabase.auth.resetPasswordForEmail(email);
                      if(error) alert(error.message);
                      else alert("Password reset link sent! Check your email.");
                  }}
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
