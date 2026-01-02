
import React, { useState, useMemo } from 'react';
import type { Tool, View } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { TOOL_TYPES } from '../constants';
import { ToolModal } from './ToolModal';

interface ToolSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tool: Tool) => void;
  tools: Tool[];
  machineType: string;
  onNavigate: (view: View) => void;
  onAddTool?: (tool: Tool) => void;
  isSuperAdmin?: boolean;
}

export const ToolSelectionModal: React.FC<ToolSelectionModalProps> = ({ isOpen, onClose, onSelect, tools, machineType, onNavigate, onAddTool, isSuperAdmin = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [minDiameter, setMinDiameter] = useState('');
  const [maxDiameter, setMaxDiameter] = useState('');
  const [isCreatingTool, setIsCreatingTool] = useState(false);

  const brands = useMemo(() => {
    const brandSet = new Set(tools.map(t => t.brand));
    return ['All', ...Array.from(brandSet).sort()];
  }, [tools]);
  
  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('All');
    setBrandFilter('All');
    setMinDiameter('');
    setMaxDiameter('');
  };

  const compatibleTools = useMemo(() => {
    return tools.filter(tool => {
      const machineTypeMatch = tool.compatibleMachineTypes.length === 0 || tool.compatibleMachineTypes.includes(machineType);
      
      const searchMatch = searchTerm === '' || 
          tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          tool.model.toLowerCase().includes(searchTerm.toLowerCase());
          
      const typeMatch = typeFilter === 'All' || tool.toolType === typeFilter;
      const brandMatch = brandFilter === 'All' || tool.brand === brandFilter;
      
      const minD = parseFloat(minDiameter);
      const maxD = parseFloat(maxDiameter);
      const minDiameterMatch = isNaN(minD) || tool.diameter >= minD;
      const maxDiameterMatch = isNaN(maxD) || tool.diameter <= maxD;
      
      return machineTypeMatch && searchMatch && typeMatch && brandMatch && minDiameterMatch && maxDiameterMatch;
    });
  }, [tools, machineType, searchTerm, typeFilter, brandFilter, minDiameter, maxDiameter]);

  const handleCreateNew = () => {
      // Instead of navigating, open ToolModal
      setIsCreatingTool(true);
  };

  const handleSaveNewTool = (newTool: Tool) => {
      if (onAddTool) {
          onAddTool(newTool);
          onSelect(newTool); // Auto-select the newly created tool
          setIsCreatingTool(false); // Close the creation modal
          onClose(); // Close the selection modal
      } else {
          // Fallback if prop not provided (shouldn't happen with updated parent)
          console.warn("onAddTool prop missing, navigating to library.");
          onNavigate('toolLibrary');
          onClose();
      }
  };

  if (!isOpen) return null;

  if (isCreatingTool) {
      return (
          <ToolModal 
            tool={null} 
            onSave={handleSaveNewTool} 
            onClose={() => setIsCreatingTool(false)} 
            currency="USD" // Default currency for new tools here, or pass user pref
            isSuperAdmin={isSuperAdmin}
          />
      );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="max-w-5xl w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
        <h2 className="text-2xl font-bold text-primary mb-6">Select a Tool</h2>
        <div className="mb-4 p-4 bg-background/50 rounded-lg border border-border grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
            <div className="lg:col-span-2">
                <Input 
                    label="Search by name or model"
                    placeholder="e.g., CoroMill"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select label="Tool Type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="All">All Types</option>
                {TOOL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </Select>
            <Select label="Brand" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
                {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Min Dia" type="number" placeholder="mm" value={minDiameter} onChange={e => setMinDiameter(e.target.value)} />
              <Input label="Max Dia" type="number" placeholder="mm" value={maxDiameter} onChange={e => setMaxDiameter(e.target.value)} />
            </div>
            <div className="lg:col-span-5 flex justify-end items-center gap-4">
                <Button variant="secondary" onClick={handleCreateNew}>+ Create New Tool</Button>
                <Button variant="secondary" onClick={resetFilters}>Reset Filters</Button>
            </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto border border-border rounded-lg">
          <table className="min-w-full divide-y divide-border table-fixed">
            <thead className="bg-background/50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-2/5">Tool Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-1/5">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Diameter (mm)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cutting Speed (m/min)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Feed/Tooth (mm)</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Select</span></th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {compatibleTools.map(tool => (
                <tr key={tool.id} className="hover:bg-background/60">
                  <td className="px-6 py-4 font-medium text-primary break-words">{tool.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.toolType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.diameter.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.cuttingSpeedVc ?? 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.feedPerTooth?.toFixed(3) ?? 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="secondary" onClick={() => onSelect(tool)}>Select</Button>
                  </td>
                </tr>
              ))}
              {compatibleTools.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-text-secondary">No compatible tools found for this machine type or search term.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-6 pt-4 border-t border-border">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
};
