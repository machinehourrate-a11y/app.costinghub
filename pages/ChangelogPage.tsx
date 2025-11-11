import React from 'react';
import { format } from 'date-fns';
import type { ChangelogPageProps, ChangeItem } from '../types';
import { Card } from '../components/ui/Card';
import { CHANGELOG_DATA } from '../constants';

const ChangeTypeBadge: React.FC<{ type: ChangeItem['type'] }> = ({ type }) => {
    const styles = {
        new: {
            bg: 'bg-green-100',
            text: 'text-green-800',
            label: 'New'
        },
        improvement: {
            bg: 'bg-blue-100',
            text: 'text-blue-800',
            label: 'Improvement'
        },
        fix: {
            bg: 'bg-red-100',
            text: 'text-red-800',
            label: 'Fix'
        }
    };

    const style = styles[type];

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
            {style.label}
        </span>
    );
};

export const ChangelogPage: React.FC<ChangelogPageProps> = () => {
    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in">
            <Card>
                <div className="border-b border-border pb-4 mb-6">
                    <h2 className="text-3xl font-bold text-primary">Software Changelog</h2>
                    <p className="mt-2 text-text-secondary">Stay up to date with the latest features, improvements, and bug fixes.</p>
                </div>
                
                <div className="flow-root">
                    <ul role="list" className="-mb-8">
                        {CHANGELOG_DATA.map((entry, entryIdx) => (
                            <li key={entry.version}>
                                <div className="relative pb-8">
                                    {entryIdx !== CHANGELOG_DATA.length - 1 ? (
                                        <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
                                    ) : null}
                                    <div className="relative flex items-start space-x-4">
                                        <div>
                                            <div className="relative px-1">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 ring-8 ring-background">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1 pt-1.5">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xl font-semibold text-text-primary">
                                                    {entry.title}
                                                    <span className="ml-3 inline-flex items-center rounded-full bg-surface px-2.5 py-1 text-sm font-medium text-text-secondary border border-border">
                                                        v{entry.version}
                                                    </span>
                                                </p>
                                                <div className="whitespace-nowrap text-right text-sm text-text-muted">
                                                    <time dateTime={entry.date}>{format(new Date(entry.date), 'MMMM d, yyyy')}</time>
                                                </div>
                                            </div>
                                            <div className="mt-3 space-y-3">
                                                {entry.changes.map((change, changeIdx) => (
                                                    <div key={changeIdx} className="flex items-start space-x-3">
                                                        <ChangeTypeBadge type={change.type} />
                                                        <p className="flex-1 text-sm text-text-secondary">{change.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </Card>
        </div>
    );
};