import React, { useState, useMemo } from 'react';
import type { Calculation, DashboardPageProps } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { DEFAULT_CALCULATION_IDS, CURRENCY_CONVERSION_RATES_TO_USD } from '../constants';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; description?: string }> = ({ title, value, icon, description }) => (
  <Card className="flex flex-col">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-lg font-semibold text-text-secondary">{title}</h3>
        <p className="text-4xl font-bold text-text-primary mt-1">{value}</p>
      </div>
      <div className="p-3 bg-primary/10 rounded-lg text-primary">{icon}</div>
    </div>
    {description && <p className="text-sm text-text-muted mt-2 flex-grow">{description}</p>}
  </Card>
);

const WelcomeBanner: React.FC<{ userName: string; onCreateClick: () => void }> = ({ userName, onCreateClick }) => (
  <div className="p-6 sm:p-8 rounded-xl bg-gradient-to-r from-primary to-secondary-accent text-white shadow-2xl shadow-primary/20">
    <h2 className="text-2xl sm:text-3xl font-bold">Welcome back, {userName}!</h2>
    <p className="mt-2 opacity-90 text-sm sm:text-base">Ready to calculate your next project? Let's get started.</p>
    <Button onClick={onCreateClick} className="mt-6 !bg-white !text-primary hover:!bg-gray-100 !font-bold w-full sm:w-auto">
      Create New Calculation
    </Button>
  </div>
);

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, calculations, onNavigate, onEdit, onDelete, onViewResults, onUpgrade, isSuperAdmin, theme }) => {
  const [calculationToDelete, setCalculationToDelete] = useState<Calculation | null>(null);

  const handleDeleteClick = (calc: Calculation) => {
    setCalculationToDelete(calc);
  };

  const confirmDelete = () => {
    if (calculationToDelete) {
      onDelete(calculationToDelete.id);
      setCalculationToDelete(null);
    }
  };
  
  const handleCreateClick = () => {
    if (isSuperAdmin) {
        onNavigate('calculator');
        return;
    }

    const { subscription_status, subscription_expires_on, calculation_limit, calculations_used } = user;
    const now = new Date();

    if (subscription_status !== 'active') {
        onUpgrade();
        return;
    }

    if (subscription_expires_on && new Date(subscription_expires_on) < now) {
        onUpgrade();
        return;
    }

    if (calculation_limit !== -1 && calculations_used >= calculation_limit) {
        onUpgrade();
        return;
    }
    
    onNavigate('calculator');
  };
  
    const summaryStats = useMemo(() => {
        const finalCalculations = calculations.filter(c => c.status === 'final' && c.results);
        const totalFinal = finalCalculations.length;
        const totalDraft = calculations.length - totalFinal;

        const totalCostUSD = finalCalculations.reduce((acc, curr) => {
            const rate = CURRENCY_CONVERSION_RATES_TO_USD[curr.inputs.currency || 'USD'] || 1;
            const costInUSD = (curr.results?.costPerPart || 0) * rate;
            return acc + costInUSD;
        }, 0);

        const averageCost = totalFinal > 0 ? totalCostUSD / totalFinal : 0;


        return {
            totalCalculations: calculations.length,
            averageCost,
            statusBreakdown: {
                final: totalFinal,
                draft: totalDraft,
            }
        };
    }, [calculations]);
    
    const statusDoughnutData = useMemo(() => {
        return {
            labels: ['Final', 'Drafts'],
            datasets: [{
                data: [summaryStats.statusBreakdown.final, summaryStats.statusBreakdown.draft],
                backgroundColor: [
                    'rgba(139, 92, 246, 0.7)', // Primary color
                    'rgba(107, 114, 128, 0.5)'  // Gray / text-muted
                ],
                borderColor: [
                    'rgba(139, 92, 246, 1)',
                    'rgba(107, 114, 128, 1)'
                ],
                borderWidth: 1,
            }]
        };
    }, [summaryStats]);
    
    const chartOptions = useMemo(() => {
      const textColor = theme === 'light' ? '#6B7280' : '#A0A0A0';
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right' as const,
            labels: {
              color: textColor
            }
          }
        }
      }
    }, [theme]);
    
    const sortedCalculations = useMemo(() => 
      [...calculations].sort((a, b) => new Date(b.inputs.createdAt).getTime() - new Date(a.inputs.createdAt).getTime()),
    [calculations]);

  return (
    <div className="w-full mx-auto space-y-8 animate-fade-in pb-20">
       {calculationToDelete && (
        <ConfirmationModal
          title="Delete Calculation"
          message={`Are you sure you want to delete the calculation for part "${calculationToDelete.inputs.partNumber}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setCalculationToDelete(null)}
        />
      )}
      
      <WelcomeBanner userName={user.name} onCreateClick={handleCreateClick} />

      {/* Summary & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatCard 
            title="Total Calculations" 
            value={String(summaryStats.totalCalculations)} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <Card>
              <h3 className="text-lg font-semibold text-text-secondary mb-4">Status Breakdown</h3>
              <div className="h-32">
                  {summaryStats.totalCalculations > 0 ? (
                      <Doughnut data={statusDoughnutData} options={chartOptions} />
                  ) : (<p className="text-center text-text-muted">No data yet.</p>)}
              </div>
          </Card>
      </div>
      
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-primary">All Machining Calculations</h2>
        </div>
        {calculations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary">You haven't created any calculations yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Part Image</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Calc. No.</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Part Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cost/Part</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {sortedCalculations.map((calc) => {
                    const isShowcase = DEFAULT_CALCULATION_IDS.has(calc.inputs.original_id!);
                    return (
                    <tr key={calc.id} className="hover:bg-background/60">
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-surface border border-border flex items-center justify-center overflow-hidden">
                              {calc.inputs.partImage ? (
                                  <img className="h-full w-full object-cover" src={calc.inputs.partImage} alt="Part" />
                              ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                              )}
                          </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{calc.inputs.calculationNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{calc.inputs.partName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{new Date(calc.inputs.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            calc.status === 'final' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {calc.status === 'final' ? 'Final' : 'Draft'}
                          </span>
                          {isShowcase && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Showcase</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {calc.status === 'final' && calc.results ? new Intl.NumberFormat('en-US', { style: 'currency', currency: calc.inputs.currency || 'USD' }).format(calc.results.costPerPart) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button variant="secondary" onClick={() => onViewResults(calc)} disabled={calc.status === 'draft'}>View</Button>
                        <Button variant="secondary" onClick={() => onEdit(calc)}>Edit</Button>
                        <Button variant="secondary" onClick={() => handleDeleteClick(calc)} className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400">Delete</Button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-4">
              {sortedCalculations.map((calc) => {
                const isShowcase = DEFAULT_CALCULATION_IDS.has(calc.inputs.original_id!);
                return (
                  <div key={calc.id} className="bg-background/50 border border-border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                            <div className="h-12 w-12 rounded-lg bg-surface border border-border flex items-center justify-center overflow-hidden">
                                {calc.inputs.partImage ? (
                                    <img className="h-full w-full object-cover" src={calc.inputs.partImage} alt="Part" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <h4 className="font-semibold text-text-primary text-base">{calc.inputs.partName}</h4>
                                <p className="text-xs text-text-secondary">#{calc.inputs.calculationNumber}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                             <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${
                                calc.status === 'final' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {calc.status === 'final' ? 'Final' : 'Draft'}
                              </span>
                              {isShowcase && <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Showcase</span>}
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm border-t border-border pt-2 mt-2">
                        <div className="text-text-secondary">
                            Date: <span className="text-text-primary">{new Date(calc.inputs.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-text-secondary">
                            Cost: <span className="font-bold text-primary">{calc.status === 'final' && calc.results ? new Intl.NumberFormat('en-US', { style: 'currency', currency: calc.inputs.currency || 'USD' }).format(calc.results.costPerPart) : 'N/A'}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                        <Button variant="secondary" onClick={() => onViewResults(calc)} disabled={calc.status === 'draft'} className="text-xs justify-center">View</Button>
                        <Button variant="secondary" onClick={() => onEdit(calc)} className="text-xs justify-center">Edit</Button>
                        <Button variant="secondary" onClick={() => handleDeleteClick(calc)} className="text-xs justify-center text-red-600 border-red-300 hover:bg-red-50">Delete</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
