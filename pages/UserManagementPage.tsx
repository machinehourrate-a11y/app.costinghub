
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import type { SubscriberInfo, UserManagementPageProps, User } from '../types';
import { Card } from '../components/ui/Card';
import { SUPER_ADMIN_EMAILS } from '../constants';
import { Button } from '../components/ui/Button';
import { UserEditModal } from '../components/UserEditModal';

ChartJS.register(Title, Tooltip, Legend, ArcElement);

type SortKey = keyof SubscriberInfo | null;
type SortDirection = 'ascending' | 'descending';
type Notification = { message: string; type: 'success' | 'error' } | null;

// Fix: Removed plans from getRowClass parameters as plan information is now on SubscriberInfo
const getRowClass = (user: SubscriberInfo): string => {
    if (SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return 'hover:bg-background/60';
    }

    if (user.subscription_status === 'banned') {
        return 'bg-red-800/20 hover:bg-red-800/30 line-through text-text-muted';
    }
    if (user.subscription_status !== 'active') {
        return 'bg-gray-500/10 hover:bg-gray-500/20 text-text-muted';
    }

    let dateString = user.subscription_expires_on;
    // Fix: Using plan_name directly from SubscriberInfo
    if (!dateString && user.plan_name === 'Free') {
        const created = new Date(user.subscribed_on);
        created.setFullYear(created.getFullYear() + 1);
        dateString = created.toISOString();
    }

    if (!dateString) {
        return 'hover:bg-background/60';
    }

    const expiryDate = new Date(dateString);
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    if (expiryDate < now) {
        return 'bg-red-500/10 hover:bg-red-500/20';
    } else if (expiryDate < sevenDaysFromNow) {
        return 'bg-yellow-500/10 hover:bg-yellow-500/20';
    }

    return 'hover:bg-background/60';
};

// Fix: Removed plans from UserManagementPageProps as it is no longer passed from App.tsx
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

    const analytics = useMemo(() => {
        const totalUsers = subscribers.length;
        const totalCalculations = subscribers.reduce((acc, user) => acc + (user.calculation_count || 0), 0);
        
        const planDistribution = subscribers.reduce((acc, user) => {
            const plan = user.plan_name || 'Free';
            acc[plan] = (acc[plan] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const userStatus = { active: 0, expired: 0, inactive: 0, banned: 0 };
        subscribers.forEach(user => {
            if (SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
                userStatus.active++;
                return;
            }
            if (user.subscription_status === 'banned') {
                userStatus.banned++;
                return;
            }
            if (user.subscription_status !== 'active') {
                userStatus.inactive++;
                return;
            }
            let dateString = user.subscription_expires_on;
            // Fix: Using plan_name directly from SubscriberInfo
            if (!dateString && user.plan_name === 'Free') {
                const created = new Date(user.subscribed_on);
                created.setFullYear(created.getFullYear() + 1);
                dateString = created.toISOString();
            }

            if (!dateString) {
                userStatus.active++;
                return;
            }

            if (new Date(dateString) < new Date()) {
                userStatus.expired++;
            } else {
                userStatus.active++;
            }
        });

        return { totalUsers, totalCalculations, planDistribution, userStatus };
    }, [subscribers]);

    const planDoughnutData = useMemo(() => ({
        labels: Object.keys(analytics.planDistribution),
        datasets: [{
            data: Object.values(analytics.planDistribution),
            backgroundColor: [
                'rgba(139, 92, 246, 0.7)',
                'rgba(236, 72, 153, 0.7)',
                'rgba(16, 185, 129, 0.7)',
                'rgba(245, 158, 11, 0.7)',
            ],
            borderColor: ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B'],
            borderWidth: 1,
        }],
    }), [analytics.planDistribution]);
    
    const statusDoughnutData = useMemo(() => ({
        labels: ['Active', 'Expired', 'Inactive', 'Banned'],
        datasets: [{
            data: [analytics.userStatus.active, analytics.userStatus.expired, analytics.userStatus.inactive, analytics.userStatus.banned],
            backgroundColor: [
                'rgba(16, 185, 129, 0.7)',  // Green
                'rgba(245, 158, 11, 0.7)',   // Yellow
                'rgba(107, 114, 128, 0.7)', // Gray
                'rgba(239, 68, 68, 0.7)',   // Red
            ],
            borderColor: ['#10B981', '#F59E0B', '#6B7280', '#EF4444'],
            borderWidth: 1,
        }],
    }), [analytics.userStatus]);
    
    const chartOptions = useMemo(() => {
      const textColor = theme === 'light' ? '#6B7280' : '#A0A0A0';
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right' as const,
            labels: { color: textColor }
          }
        }
      }
    }, [theme]);

    const renderExpiryDate = (user: SubscriberInfo) => {
        if (SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
            return <span className="text-text-muted">Not Applicable</span>;
        }

        let dateString = user.subscription_expires_on;
        
        // Fix: Using plan_name directly from SubscriberInfo
        if (!dateString && user.plan_name === 'Free') {
            const created = new Date(user.subscribed_on);
            created.setFullYear(created.getFullYear() + 1);
            dateString = created.toISOString();
        }

        if (!dateString) {
            return <span className="text-text-muted">N/A</span>;
        }

        const expiryDate = new Date(dateString);
        const now = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(now.getDate() + 7);

        let className = 'text-text-secondary';
        if (expiryDate < now) {
            className = 'text-red-500 font-semibold';
        } else if (expiryDate < sevenDaysFromNow) {
            className = 'text-yellow-500 font-semibold';
        }

        return <span className={className}>{expiryDate.toLocaleDateString()}</span>;
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
        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="flex flex-col justify-center text-center">
                <h3 className="text-lg font-semibold text-primary mb-2">Total Users</h3>
                <p className="text-5xl font-bold">{analytics.totalUsers}</p>
            </Card>
             <Card className="flex flex-col justify-center text-center">
                <h3 className="text-lg font-semibold text-primary mb-2">Total Calculations Created</h3>
                <p className="text-5xl font-bold">{analytics.totalCalculations}</p>
            </Card>
            <Card>
                <h3 className="text-lg font-semibold text-primary mb-4">Plan Distribution</h3>
                <div className="h-40">
                    {analytics.totalUsers > 0 ? (
                        <Doughnut data={planDoughnutData} options={chartOptions} />
                    ) : <p className="text-center text-text-muted">No user data available.</p>}
                </div>
            </Card>
             <Card>
                <h3 className="text-lg font-semibold text-primary mb-4">User Status</h3>
                <div className="h-40">
                    {analytics.totalUsers > 0 ? (
                        <Doughnut data={statusDoughnutData} options={chartOptions} />
                    ) : <p className="text-center text-text-muted">No user data available.</p>}
                </div>
            </Card>
        </div>
        
      <Card>
        <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-primary">User Management</h2>
          <span className="text-text-secondary">{subscribers.length} users found</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('name')}>
                    User{getSortIndicator('name')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('plan_name')}>
                    Subscription Plan{getSortIndicator('plan_name')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('calculation_count')}>
                    Calculations{getSortIndicator('calculation_count')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('subscribed_on')}>
                    Subscribed On{getSortIndicator('subscribed_on')}
                </th>
                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('subscription_expires_on')}>
                    Expires On{getSortIndicator('subscription_expires_on')}
                </th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {sortedSubscribers.map((user) => (
                <tr key={user.id} className={getRowClass(user)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-text-primary">{user.name}</div>
                    <div className="text-sm text-text-secondary">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center gap-2">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.plan_name === 'Professional' ? 'bg-blue-100 text-blue-800' :
                            user.plan_name === 'Enterprise' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                            {user.plan_name || 'Free'}
                        </span>
                        {user.subscription_status && user.subscription_status !== 'active' && (
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                                user.subscription_status === 'banned' ? 'bg-red-200 text-red-800' :
                                user.subscription_status === 'expired' ? 'bg-yellow-200 text-yellow-800' :
                                'bg-gray-200 text-gray-800'
                            }`}>
                                {user.subscription_status}
                            </span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary text-center">{user.calculation_count || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{user.subscribed_on ? new Date(user.subscribed_on).toLocaleDateString() : 'N/A'}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {renderExpiryDate(user)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()) && (
                            <div className="flex items-center justify-end space-x-2">
                                <Button variant="secondary" onClick={() => handleEditUser(user)}>Edit</Button>
                                <div className="relative" ref={dropdownRef}>
                                    <Button variant="secondary" onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}>
                                        Actions
                                        <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </Button>
                                    {activeDropdown === user.id && (
                                        <div className="absolute right-0 mt-2 w-56 origin-top-right bg-surface rounded-md shadow-lg ring-1 ring-border ring-opacity-5 focus:outline-none z-10 animate-fade-in">
                                            <div className="py-1">
                                                <button onClick={() => handleAction(onSendRecovery, user.email, `Password recovery sent to ${user.email}`)} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background/60">Send Recovery Email</button>
                                                <button onClick={() => handleAction(onSendConfirmation, user.email, `Confirmation resent to ${user.email}`)} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background/60">Resend Confirmation</button>
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
