
import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { UserEditModalProps, User } from '../types';

export const UserEditModal: React.FC<Omit<UserEditModalProps, 'plans'>> = ({ user, onSave, onClose }) => {
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setName(user.name);
        setCompanyName(user.company_name || '');
    }, [user]);

    const handleSave = async () => {
        setIsSaving(true);
        const updates: Partial<User> = {
            name: name,
            companyName: companyName,
        };
        try {
            await onSave(user.id, updates);
        } catch (error) {
            console.error("Failed to save user updates", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
            <Card className="max-w-lg w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h2 className="text-xl font-bold text-primary mb-4 uppercase tracking-tight">Identity Overrides</h2>
                <p className="text-xs text-text-secondary mb-6 font-bold uppercase tracking-widest">{user.email}</p>

                <div className="space-y-4 pr-2">
                    <Input 
                        label="Full Legal Name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                    
                    <Input 
                        label="Operating Company"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                    />
                    <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded text-[10px] text-yellow-600 font-bold uppercase tracking-widest">
                        Subscription plans and limits cannot be modified manually. All plan logic is controlled by the external billing gateway.
                    </div>
                </div>
                
                <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-border">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Discard</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Commit Meta'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};
