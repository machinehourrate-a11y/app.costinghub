
import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface BreakdownItem {
    label: string;
    value: number;
}

interface CalculatorSummaryProps {
    partCostBreakdown: BreakdownItem[];
    totalCostPerPart: number;
    currency: string;
    theme: 'light' | 'dark';
    onSaveDraft: () => void;
    onSubmit: () => void;
    saveStatus: 'idle' | 'saved' | 'unsaved' | 'saving';
}

const formatCurrency = (value: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(value);
    } catch {
        return `$${value.toFixed(2)}`;
    }
};

export const CalculatorSummary: React.FC<CalculatorSummaryProps> = ({ partCostBreakdown, totalCostPerPart, currency, theme, onSaveDraft, onSubmit, saveStatus }) => {
    
    const pieChartData = React.useMemo(() => ({
        labels: partCostBreakdown.map(d => d.label),
        datasets: [
            {
                data: partCostBreakdown.map(d => d.value),
                backgroundColor: [
                    '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444',
                    '#6366f1', '#84cc16', '#d946ef', '#06b6d4', '#f97316', '#14b8a6'
                ],
                borderColor: theme === 'dark' ? '#1f2937' : '#FFFFFF',
                borderWidth: 2,
            },
        ],
    }), [partCostBreakdown, theme]);

    const pieChartOptions = React.useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: { display: false },
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        let label = context.label || '';
                        if (label) label += ': ';
                        if (context.parsed !== null) label += formatCurrency(context.parsed, currency);
                        return label;
                    }
                }
            },
            datalabels: {
                formatter: (value: number, ctx: any) => {
                    const total = ctx.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                    if (total === 0) return '0%';
                    const percentage = (value / total * 100);
                    return percentage > 7 ? percentage.toFixed(0) + '%' : '';
                },
                color: '#fff',
                font: { weight: 'bold' as const, size: 10 }
            }
        },
    }), [theme, currency]);

    return (
        <Card className="w-full">
            <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Live Summary</h2>
            
            <div className="h-64 relative mb-6">
                <Pie data={pieChartData} options={pieChartOptions} />
            </div>

            <div className="space-y-2 mb-6">
                {partCostBreakdown.map((item, index) => (
                    <div key={item.label} className="flex justify-between items-center py-2 px-3 rounded-md bg-background/50 text-sm">
                        <div className="flex items-center">
                            <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: pieChartData.datasets[0].backgroundColor[index % pieChartData.datasets[0].backgroundColor.length] }}></span>
                            <span className="text-text-secondary">{item.label}</span>
                        </div>
                        <span className="font-semibold text-text-primary">{formatCurrency(item.value, currency)}</span>
                    </div>
                ))}
            </div>

            <div className="bg-primary/10 p-4 text-center border-t-2 border-primary mt-4 rounded-b-lg -m-6 rounded-t-none">
                <span className="text-sm font-semibold uppercase text-primary/80 tracking-wider">Final Part Cost</span>
                <span className="block text-4xl font-black text-primary mt-1">{formatCurrency(totalCostPerPart, currency)}</span>
            </div>
        </Card>
    );
};
