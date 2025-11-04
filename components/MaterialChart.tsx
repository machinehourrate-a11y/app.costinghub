import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Chart,
} from 'chart.js';
import type { MaterialMasterItem, MaterialProperty } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MaterialChartProps {
  material: MaterialMasterItem;
  allMaterials: MaterialMasterItem[];
}

// Select key properties for visual comparison on the chart
const chartProperties = [
    'Tensile Strength, Ultimate',
    'Modulus of Elasticity',
    'Thermal Conductivity',
    'Hardness, Brinell',
    'Elongation at Break',
    'Hardness, Rockwell C',
];

const getNumericPropertyValue = (material: MaterialMasterItem, propName: string): number | null => {
    if (material.properties && typeof material.properties === 'object') {
        const prop = (material.properties as any)[propName];
        if (prop && typeof prop === 'object' && 'value' in prop) {
            const val = parseFloat(prop.value);
            if (!isNaN(val)) return val;
        }
    }
    return null;
}

export const MaterialChart: React.FC<MaterialChartProps> = ({ material, allMaterials }) => {
  const maxValues = chartProperties.reduce((acc, propName) => {
      const values = allMaterials
          .map(m => getNumericPropertyValue(m, propName))
          .filter(v => v !== null) as number[];
      acc[propName] = Math.max(...values, 0);
      return acc;
  }, {} as {[key: string]: number});

  const chartData = {
    labels: chartProperties.map(p => p.replace(/, |\(.*\)/g, ' ')),
    datasets: [
      {
        label: material.name,
        data: chartProperties.map(prop => {
            const value = getNumericPropertyValue(material, prop);
            const max = maxValues[prop];
            if (value !== null && max > 0) {
                return (value / max) * 100;
            }
            return 0;
        }),
        backgroundColor: (context: any) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) {
                return 'rgba(139, 92, 246, 0.7)';
            }
            const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
            gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.8)');
            gradient.addColorStop(1, 'rgba(236, 72, 153, 0.8)');
            return gradient;
        },
        borderColor: 'var(--color-primary)',
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        grid: { color: 'var(--color-border)' },
        ticks: { 
            color: 'var(--color-text-secondary)',
            callback: (value: any) => value + '%'
        },
        title: {
            display: true,
            text: 'Relative Performance (%)',
            color: 'var(--color-text-secondary)'
        }
      },
      y: {
        grid: { display: false },
        ticks: { color: 'var(--color-text-primary)', font: { size: 14 } },
      },
    },
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            callbacks: {
                label: function(context: any) {
                    const propName = chartProperties[context.dataIndex];
                    if (material.properties && typeof material.properties === 'object') {
                        const originalValue = (material.properties as any)[propName];
                        if (originalValue && typeof originalValue === 'object' && 'value' in originalValue && 'unit' in originalValue) {
                            const prop = originalValue as MaterialProperty;
                            return `${propName}: ${prop.value} ${prop.unit}`;
                        }
                    }
                    return '';
                }
            }
        }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="h-96">
            <Bar data={chartData} options={options} />
        </div>
        <div>
            <h3 className="text-xl font-bold text-primary mb-2">Detailed Properties</h3>
            <div className="space-y-1 text-sm max-h-80 overflow-y-auto pr-2">
                {typeof material.properties === 'object' && material.properties && !Array.isArray(material.properties) ? 
                    Object.entries(material.properties).map(([key, prop]) => {
                        if (prop && typeof prop === 'object' && !Array.isArray(prop) && 'value' in prop && 'unit' in prop) {
                            const materialProp = prop as unknown as MaterialProperty;
                            return (
                                <div key={key} className="flex justify-between p-2 rounded hover:bg-surface/60">
                                    <span className="text-text-secondary">{key}</span>
                                    <span className="font-semibold text-text-primary">{materialProp.value} {materialProp.unit}</span>
                                </div>
                            );
                        }
                        return null;
                    })
                    : <p className="text-text-muted text-center p-4">No detailed properties available.</p>
                }
            </div>
        </div>
    </div>
  );
};
