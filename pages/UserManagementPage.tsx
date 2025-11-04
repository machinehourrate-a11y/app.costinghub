import React, { useState, useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import type { SubscriberInfo, UserManagementPageProps } from '../types';
import { Card } from '../components/ui/Card';

ChartJS.register(Title, Tooltip, Legend, ArcElement);

type SortKey = keyof SubscriberInfo | null;
type SortDirection = 'ascending' | 'descending';

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ subscribers, theme }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'subscribed_on', direction: 'descending' });

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
        return { totalUsers, totalCalculations, planDistribution };
    }, [subscribers]);

    const doughnutData = useMemo(() => ({
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


  return (
    <div className="w-full mx-auto space-y-8 animate-fade-in">
        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="flex flex-col justify-center text-center">
                <h3 className="text-lg font-semibold text-primary mb-2">Total Users</h3>
                <p className="text-5xl font-bold">{analytics.totalUsers}</p>
            </Card>
            <Card className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-primary mb-4">Plan Distribution</h3>
                <div className="h-40">
                    {analytics.totalUsers > 0 ? (
                        <Doughnut data={doughnutData} options={chartOptions} />
                    ) : <p className="text-center text-text-muted">No user data available.</p>}
                </div>
            </Card>
            <Card className="flex flex-col justify-center text-center lg:col-span-3">
                <h3 className="text-lg font-semibold text-primary mb-2">Total Calculations Created</h3>
                <p className="text-5xl font-bold">{analytics.totalCalculations}</p>
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Company Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('plan_name')}>
                    Subscription Plan{getSortIndicator('plan_name')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('calculation_count')}>
                    Calculations{getSortIndicator('calculation_count')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('subscribed_on')}>
                    Subscribed On{getSortIndicator('subscribed_on')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {sortedSubscribers.map((user) => (
                <tr key={user.id} className="hover:bg-background/60">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-text-primary">{user.name}</div>
                    <div className="text-sm text-text-secondary">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{user.company_name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.subscription_status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.plan_name || 'Free'}
                      </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary text-center">{user.calculation_count || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{user.subscribed_on ? new Date(user.subscribed_on).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};