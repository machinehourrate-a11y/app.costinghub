import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import type { Feedback, FeedbackListPageProps } from '../types';
import { Card } from '../components/ui/Card';

type SortKey = keyof Feedback | 'created_at' | null;
type SortDirection = 'ascending' | 'descending';

const DetailRow: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => (
    <div>
        <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{label}</h4>
        <p className="mt-1 text-text-primary whitespace-pre-wrap">{value || 'N/A'}</p>
    </div>
);

export const FeedbackListPage: React.FC<FeedbackListPageProps> = ({ feedbacks }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'created_at', direction: 'descending' });
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

    const sortedFeedbacks = useMemo(() => {
        let sortableItems = [...feedbacks];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const key = sortConfig.key as keyof Feedback;
                if (!key || a[key] === null || b[key] === null) return 0;
                
                const valA = a[key]!;
                const valB = b[key]!;
                
                if (valA < valB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [feedbacks, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortKey) => {
      if (!sortConfig || sortConfig.key !== key) return null;
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    return (
        <div className="w-full mx-auto flex flex-col lg:flex-row gap-8 animate-fade-in">
            <div className="lg:w-1/2">
                <Card>
                    <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                        <h2 className="text-2xl font-bold text-primary">User Feedback & Requests</h2>
                        <span className="text-text-secondary">{feedbacks.length} submissions</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-background/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('user_email')}>
                                        User{getSortIndicator('user_email')}
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('created_at')}>
                                        Submitted On{getSortIndicator('created_at')}
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Experience
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Feature Requests
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {sortedFeedbacks.map((feedback) => (
                                    <tr 
                                        key={feedback.id}
                                        className={`hover:bg-background/60 cursor-pointer ${selectedFeedback?.id === feedback.id ? 'bg-primary/10' : ''}`}
                                        onClick={() => setSelectedFeedback(feedback)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{feedback.user_email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                            {feedback.created_at ? format(new Date(feedback.created_at), 'PPp') : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary"><div className="max-w-xs truncate" title={feedback.usage_experience}>{feedback.usage_experience}</div></td>
                                        <td className="px-6 py-4 text-sm text-text-secondary"><div className="max-w-xs truncate" title={feedback.feature_requests || ''}>{feedback.feature_requests || 'N/A'}</div></td>
                                    </tr>
                                ))}
                                {sortedFeedbacks.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-10 text-text-secondary">
                                            No feedback has been submitted yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
            <div className="lg:w-1/2">
                <Card className="sticky top-24">
                     {selectedFeedback ? (
                        <div className="animate-fade-in">
                             <h2 className="text-xl font-bold text-primary mb-6 border-b border-border pb-3">Feedback Details</h2>
                            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                                <div className="grid grid-cols-1 gap-6">
                                    <DetailRow label="User" value={selectedFeedback.user_email} />
                                    <DetailRow label="Submitted On" value={selectedFeedback.created_at ? format(new Date(selectedFeedback.created_at), 'PPpp') : 'N/A'} />
                                </div>
                                
                                <DetailRow label="Usage Duration" value={selectedFeedback.usage_duration} />
                                <DetailRow label="Experience" value={selectedFeedback.usage_experience} />
                                <DetailRow label="Feature Requests" value={selectedFeedback.feature_requests} />
                                <DetailRow label="Suggested Changes" value={selectedFeedback.suggested_changes} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary p-8 min-h-[400px]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-text-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                            <h3 className="font-semibold text-primary">View Details</h3>
                            <p>Select a feedback from the list to see its full content.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};