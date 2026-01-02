
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface MfaEnrollmentModalProps {
  qrCodeSvg: string;
  secret: string;
  onVerify: (code: string) => Promise<void>;
  onClose: () => void;
}

export const MfaEnrollmentModal: React.FC<MfaEnrollmentModalProps> = ({ qrCodeSvg, secret, onVerify, onClose }) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setError('');
    setIsVerifying(true);
    try {
      await onVerify(code);
    } catch (e: any) {
      setError(e.message || "Invalid verification code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="max-w-md w-full relative">
        <h2 className="text-xl font-bold text-primary mb-4">Enable Multi-Factor Authentication</h2>
        <p className="text-text-secondary mb-4 text-sm">Scan the QR code with your authenticator app (e.g., Google Authenticator, Authy) or manually enter the secret key.</p>
        
        <div className="flex flex-col items-center space-y-4 my-6">
          <div 
            className="p-4 bg-white rounded-lg"
            dangerouslySetInnerHTML={{ __html: qrCodeSvg }} 
          />
          <div className="text-center">
            <p className="text-sm text-text-secondary">Or enter this key manually:</p>
            <p className="font-mono text-text-primary bg-background/50 px-3 py-1.5 rounded-md border border-border mt-1">{secret}</p>
          </div>
        </div>

        <p className="text-text-secondary mb-4 text-sm">Then, enter the 6-digit code from your app to verify and complete the setup.</p>

        <div className="space-y-4">
          <Input 
            label="Verification Code"
            name="mfa-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            maxLength={6}
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} disabled={isVerifying}>Cancel</Button>
          <Button onClick={handleVerify} disabled={isVerifying || code.length < 6}>
            {isVerifying ? 'Verifying...' : 'Verify & Enable'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
