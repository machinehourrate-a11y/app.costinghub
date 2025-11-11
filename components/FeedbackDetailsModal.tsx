import React from 'react';
import { format } from 'date-fns';
import type { Feedback } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { CloseIcon } from './ui/CloseIcon';

interface FeedbackDetailsModalProps {
    feedback: Feedback;
    onClose: () => void;
}

const DetailRow: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => (
    <div>
        <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{label}</h4>
        <p className="mt-1 text-text-primary whitespace-pre-wrap">{value || 'N/A'}</p>
    </div>
);

export const FeedbackDetailsModal: React.FC<FeedbackDetailsModalProps> = ({ feedback, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
            <Card className="max-w-2xl w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
                    <CloseIcon />
                </button>
                <h2 className="text-2xl font-bold text-primary mb-6 border-b border-border pb-3">Feedback Details</h2>

                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DetailRow label="User" value={feedback.user_email} />
                        <DetailRow label="Submitted On" value={feedback.created_at ? format(new Date(feedback.created_at), 'PPpp') : 'N/A'} />
                    </div>
                    
                    <DetailRow label="Usage Duration" value={feedback.usage_duration} />
                    <DetailRow label="Experience" value={feedback.usage_experience} />
                    <DetailRow label="Feature Requests" value={feedback.feature_requests} />
                    <DetailRow label="Suggested Changes" value={feedback.suggested_changes} />
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-border">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </Card>
        </div>
    );
};
