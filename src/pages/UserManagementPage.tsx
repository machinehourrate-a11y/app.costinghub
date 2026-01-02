
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { SubscriberInfo, UserManagementPageProps, User } from '../types';
import { Card } from '../components/ui/Card';
import { SUPER_ADMIN_EMAILS } from '../constants';
import { Button } from '../components/ui/Button';
import { UserEditModal } from '../components/UserEditModal';

type SortKey = keyof SubscriberInfo | null;
type SortDirection = 'ascending' | 'descending';
type Notification = { message: string; type: 'success' | 'error' } | null;

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ subscribers, theme, onUpdateUser, onSendRecovery, onSendConfirmation }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'subscribed_on', direction: 'descending' });
    const [userToEdit, setUserToEdit] = useState<SubscriberInfo | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notification>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleAction = async (action: (email: string) => Promise<void>, email: string, successMessage: string) => {
        try {
            await action(email);
            showNotification(successMessage, 'success');
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
        }
        setActiveDropdown(null);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEditUser = (user: SubscriberInfo) => {
        setUserToEdit(user);
    };

    const handleSaveUser = async (userId: string, updates: Partial<User>) => {
        await onUpdateUser(userId, updates);
        showNotification('User updated successfully!', 'success');
        setUserToEdit(null);
    };

    const sortedSubscribers = useMemo(() => {
        let sortableItems = [...subscribers];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const key = sortConfig.key;
                if (!key || a[key] === null || b[key] === null) return 0;
                
                if (a[key] < b[key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[key] > b[key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [subscribers, sortConfig]);

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
    <div className="w-full mx-auto space-y-8 animate-fade-in">
        {notification && (
            <div className={`fixed top-20 right-8 z-50 p-4 rounded-lg shadow-lg animate-fade-in text-white ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                {notification.message}
            </div>
        )}
        {userToEdit && (
            <UserEditModal 
                user={userToEdit}
                onClose={() => setUserToEdit(null)}
                onSave={handleSaveUser}
            />
        )}
        
      <Card>
        <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-primary">System Users</h2>
          <span className="text-text-secondary">{subscribers.length} identities found</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('name')}>
                    Identity{getSortIndicator('name')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('plan_name')}>
                    Plan{getSortIndicator('plan_name')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('calculation_count')}>
                    Calculations{getSortIndicator('calculation_count')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('subscribed_on')}>
                    Created On{getSortIndicator('subscribed_on')}
                </th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {sortedSubscribers.map((user) => (
                <tr key={user.id} className="hover:bg-background/60">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-text-primary">{user.name}</div>
                    <div className="text-xs text-text-muted uppercase font-black">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-1 rounded">
                        {user.plan_name || 'Free Tier'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary text-center">{user.calculation_count || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{user.subscribed_on ? new Date(user.subscribed_on).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()) && (
                            <div className="flex items-center justify-end space-x-2">
                                <Button variant="secondary" className="!px-3 !py-1 text-[10px] font-black uppercase tracking-widest" onClick={() => handleEditUser(user)}>Meta</Button>
                                <div className="relative" ref={dropdownRef}>
                                    <Button variant="secondary" className="!px-3 !py-1 text-[10px] font-black uppercase tracking-widest" onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}>
                                        Auth
                                    </Button>
                                    {activeDropdown === user.id && (
                                        <div className="absolute right-0 mt-2 w-56 origin-top-right bg-surface border border-border rounded-md shadow-2xl z-10 animate-fade-in">
                                            <div className="py-1">
                                                <button onClick={() => handleAction(onSendRecovery, user.email, `Magic link sent to ${user.email}`)} className="w-full text-left block px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-primary hover:bg-background/60">Recovery Link</button>
                                                <button onClick={() => handleAction(onSendConfirmation, user.email, `Activation resent to ${user.email}`)} className="w-full text-left block px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-primary hover:bg-background/60">Resend Invite</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
