
import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { CloseIcon } from './ui/CloseIcon';
import type { CalculationShare } from '../types';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    calculationId: string;
    currentUserEmail: string;
    onShare: (calculationId: string, email: string) => Promise<void>;
    onRevoke: (shareId: string) => Promise<void>;
    onGetShares: (calculationId: string) => Promise<CalculationShare[]>;
}

export const ShareModal: React.FC<ShareModalProps> = ({ 
    isOpen, onClose, calculationId, currentUserEmail, onShare, onRevoke, onGetShares 
}) => {
    const [email, setEmail] = useState('');
    const [shares, setShares] = useState<CalculationShare[]>([]);
    const [loading, setLoading] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadShares();
        }
    }, [isOpen, calculationId]);

    const loadShares = async () => {
        setLoading(true);
        try {
            const data = await onGetShares(calculationId);
            setShares(data);
        } catch (err: any) {
            console.error("Failed to load shares", err);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        if (email.toLowerCase() === currentUserEmail.toLowerCase()) {
            setError("You cannot share with yourself.");
            return;
        }

        setShareLoading(true);
        setError('');
        try {
            await onShare(calculationId, email);
            setEmail('');
            await loadShares(); // Refresh list
        } catch (err: any) {
            setError(err.message || "Failed to share calculation.");
        } finally {
            setShareLoading(false);
        }
    };

    const handleRevoke = async (shareId: string) => {
        try {
            await onRevoke(shareId);
            setShares(prev => prev.filter(s => s.id !== shareId));
        } catch (err: any) {
            alert("Failed to revoke access.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
            <Card className="max-w-md w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
                    <CloseIcon />
                </button>
                <h2 className="text-xl font-bold text-primary mb-4">Share Calculation</h2>
                <p className="text-sm text-text-secondary mb-6">Invite others to collaborate on this calculation. They will be able to view and edit it.</p>

                <form onSubmit={handleShare} className="flex gap-2 mb-6">
                    <div className="flex-grow">
                         <Input 
                            label="" 
                            placeholder="Enter email address" 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" disabled={shareLoading}>
                        {shareLoading ? 'Sharing...' : 'Invite'}
                    </Button>
                </form>
                
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-text-primary mb-3">People with access</h3>
                    {loading ? (
                        <p className="text-text-muted text-sm">Loading...</p>
                    ) : shares.length === 0 ? (
                        <p className="text-text-muted text-sm italic">Not shared with anyone yet.</p>
                    ) : (
                        <ul className="space-y-3">
                             <li className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                        {currentUserEmail.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <span className="block text-text-primary font-medium">You</span>
                                        <span className="block text-text-muted text-xs">{currentUserEmail}</span>
                                    </div>
                                </div>
                                <span className="text-text-muted text-xs bg-surface border border-border px-2 py-0.5 rounded">Owner</span>
                            </li>
                            {shares.map(share => (
                                <li key={share.id} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-secondary-accent/20 flex items-center justify-center text-secondary-accent font-bold text-xs">
                                            {share.shared_with_email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <span className="block text-text-primary">{share.shared_with_email}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRevoke(share.id)}
                                        className="text-red-500 hover:text-red-600 text-xs hover:underline"
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-border">
                    <Button variant="secondary" onClick={onClose}>Done</Button>
                </div>
            </Card>
        </div>
    );
};
