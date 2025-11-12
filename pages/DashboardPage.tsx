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


export const DashboardPage: React.FC<DashboardPageProps> = ({ user, calculations, onNavigate, onEdit, onDelete, onViewResults, userPlan, onUpgrade, isSuperAdmin, theme }) => {
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

  const calculationLimit = userPlan?.calculation_limit ?? 5; // Default to 5 for safety
  const lifetimeCount = user.calculations_created_this_period || 0;
  const isLimitReached = !isSuperAdmin && calculationLimit !== -1 && lifetimeCount >= calculationLimit;
  
  const handleCreateClick = () => {
    if (isLimitReached) {
      onUpgrade();
    } else {
      onNavigate('calculator');
    }
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
        const textColor = theme === 'light' ? '#6B7280' : '#A0A0A0'; // Corresponds to text-secondary
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
    }, [summaryStats, theme]);
    
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
    <div className="w-full mx-auto space-y-8 animate-fade-in">
       {calculationToDelete && (
        <ConfirmationModal
          title="Delete Calculation"
          message={`Are you sure you want to delete the calculation for part "${calculationToDelete.inputs.partNumber}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setCalculationToDelete(null)}
        />
      )}

      {/* Summary & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="flex flex-col justify-between">
              <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">Total Calculations</h3>
                  <p className="text-4xl font-bold">{summaryStats.totalCalculations}</p>
              </div>
          </Card>
          <Card className="flex flex-col justify-between">
              <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">Avg. Cost / Part (USD)</h3>
                  <p className="text-4xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summaryStats.averageCost)}</p>
              </div>
              <p className="text-sm text-text-muted mt-2">(converted to USD across all final calculations)</p>
          </Card>
          <Card>
              <h3 className="text-lg font-semibold text-primary mb-4">Status Breakdown</h3>
              <div className="h-32">
                  {summaryStats.totalCalculations > 0 ? (
                      <Doughnut data={statusDoughnutData} options={chartOptions} />
                  ) : (<p className="text-center text-text-muted">No data yet.</p>)}
              </div>
          </Card>
      </div>
      
      <Card>
        <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => onNavigate('landing')}>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Button>
            <h2 className="text-2xl font-bold text-primary">All Machining Calculations</h2>
          </div>
          <div className="flex items-center space-x-4">
            {isSuperAdmin && (
              <span className="text-sm font-semibold rounded-full bg-primary/20 text-primary/80 px-3 py-1">Admin Access</span>
            )}
            <Button 
              onClick={handleCreateClick}
              className={isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}
              title={isLimitReached ? `You have reached your limit of ${calculationLimit} calculations. Please upgrade your plan.` : ''}
            >
              Create New Calculation
            </Button>
          </div>
        </div>
        {calculations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary">You haven't created any calculations yet.</p>
            <p className="text-text-secondary">Get started by creating a new one!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-surface border border-border flex items-center justify-center">
                            {calc.inputs.partImage ? (
                                <img className="h-full w-full rounded-full object-cover" src={calc.inputs.partImage} alt="Part" />
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
        )}
      </Card>
    </div>
  );
};