
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface MfaDisableModalProps {
  onConfirm: (code: string) => Promise<void>;
  onClose: () => void;
  isDisabling: boolean;
  error: string;
}

export const MfaDisableModal: React.FC<MfaDisableModalProps> = ({ onConfirm, onClose, isDisabling, error }) => {
  const [code, setCode] = useState('');

  const handleConfirm = async () => {
    await onConfirm(code);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="max-w-md w-full relative">
        <h2 className="text-xl font-bold text-primary mb-4">Disable Multi-Factor Authentication</h2>
        <p className="text-text-secondary mb-4 text-sm">
          For your security, please enter a valid code from your authenticator app to confirm you want to disable MFA.
        </p>
        
        <div className="space-y-4">
          <Input 
            label="Verification Code"
            name="mfa-disable-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            maxLength={6}
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} disabled={isDisabling}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isDisabling || code.length < 6}>
            {isDisabling ? 'Disabling...' : 'Confirm & Disable'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
