import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabaseClient';

interface ResetPasswordPageProps {
  onPasswordReset: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onPasswordReset }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
        setError("Password should be at least 6 characters.");
        return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    // FIX: `updateUser` is on the `api` object in older versions of the SDK.
    const { error } = await supabase.auth.api.updateUser({ password });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Your password has been reset successfully! Redirecting...");
      setTimeout(() => {
        onPasswordReset();
      }, 2000);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-12 md:py-24 animate-fade-in">
      <Card>
        <div className="text-center">
            <h1 className="text-3xl font-bold text-primary mb-2">
                Set a New Password
            </h1>
            <p className="text-text-secondary mb-8">
                Please enter your new password below.
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="New Password" 
            type="password" 
            name="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            disabled={loading || !!success}
          />
          <Input 
            label="Confirm New Password" 
            type="password" 
            name="confirmPassword" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            required 
            disabled={loading || !!success}
          />

          {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center pt-2">{success}</p>}
          
          <Button type="submit" className="w-full !mt-6" disabled={loading || !!success}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
          
        </form>
      </Card>
    </div>
  );
};
