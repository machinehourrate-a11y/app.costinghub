import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ToolModal } from '../components/ToolModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import type { Tool, ToolLibraryPageProps, User } from '../types';
import { MultiToolModal } from '../components/MultiToolModal';
import { TOOL_TYPES, TOOL_MATERIALS, DEFAULT_TOOL_IDS, SUPER_ADMIN_EMAILS } from '../constants';

const currencySymbols: { [key: string]: string } = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

const ITEMS_PER_PAGE = 10;

export const ToolLibraryPage: React.FC<ToolLibraryPageProps & { user: User }> = ({ user, tools, onAddTool, onUpdateTool, onDeleteTool, onAddMultipleTools }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [toolToDelete, setToolToDelete] = useState<Tool | null>(null);
  
  // Filters and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [materialFilter, setMaterialFilter] = useState('All');
  const [minDiameter, setMinDiameter] = useState('');
  const [maxDiameter, setMaxDiameter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const isSuperAdmin = useMemo(() => SUPER_ADMIN_EMAILS.includes(user.email), [user.email]);
  
  const currency = user.currency || 'USD';
  const currencySymbol = currencySymbols[currency] || '$';

  const handleAddNew = () => {
    setEditingTool(null);
    setIsModalOpen(true);
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setIsModalOpen(true);
  };

  const handleDelete = (tool: Tool) => {
    setToolToDelete(tool);
  };

  const confirmDelete = () => {
    if (toolToDelete) {
      onDeleteTool(toolToDelete.id);
      setToolToDelete(null);
    }
  };

  const handleSaveTool = (tool: Tool) => {
    if (editingTool) {
      onUpdateTool(tool);
    } else {
      onAddTool(tool);
    }
    setIsModalOpen(false);
  };

  // Memoized filtering logic
  const filteredTools = useMemo(() => {
    return tools.filter(tool => {
        const lowercasedTerm = searchTerm.toLowerCase();
        const searchMatch = searchTerm === '' ||
            tool.name.toLowerCase().includes(lowercasedTerm) ||
            tool.brand.toLowerCase().includes(lowercasedTerm) ||
            tool.model.toLowerCase().includes(lowercasedTerm);

        const typeMatch = typeFilter === 'All' || tool.toolType === typeFilter;
        const materialMatch = materialFilter === 'All' || tool.material === materialFilter;
        
        const minD = parseFloat(minDiameter);
        const maxD = parseFloat(maxDiameter);
        const minDiameterMatch = isNaN(minD) || tool.diameter >= minD;
        const maxDiameterMatch = isNaN(maxD) || tool.diameter <= maxD;

        return searchMatch && typeMatch && materialMatch && minDiameterMatch && maxDiameterMatch;
    });
  }, [tools, searchTerm, typeFilter, materialFilter, minDiameter, maxDiameter]);

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('All');
    setMaterialFilter('All');
    setMinDiameter('');
    setMaxDiameter('');
    setCurrentPage(1);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredTools.length / ITEMS_PER_PAGE);
  const paginatedTools = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTools.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTools, currentPage]);
  
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
      setter(value);
      setCurrentPage(1);
  };


  return (
    <div className="w-full mx-auto space-y-8 animate-fade-in">
      {isModalOpen && (
        <ToolModal 
          tool={editingTool} 
          onSave={handleSaveTool} 
          onClose={() => setIsModalOpen(false)} 
          currency={currency}
        />
      )}
      {isMultiModalOpen && (
        <MultiToolModal
            onClose={() => setIsMultiModalOpen(false)}
            onSave={(newTools) => {
                onAddMultipleTools(newTools);
                setIsMultiModalOpen(false);
            }}
        />
      )}
      {toolToDelete && (
        <ConfirmationModal
          title="Delete Tool"
          message={`Are you sure you want to delete "${toolToDelete.name}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setToolToDelete(null)}
        />
      )}
      
      <Card>
        <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-primary">Tool Library</h2>
          <div className="flex items-center space-x-4">
            <Button onClick={handleAddNew}>+ Add New Tool</Button>
            <Button onClick={() => setIsMultiModalOpen(true)}>+ Add Multiple with AI</Button>
          </div>
        </div>
        
        {/* Filter Section */}
        <div className="p-4 bg-background/50 rounded-lg border border-border mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div className="lg:col-span-2">
                    <Input
                        label="Search Name, Brand or Model"
                        placeholder="e.g., CoroMill Plura"
                        value={searchTerm}
                        onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
                    />
                </div>
                <Select
                    label="Tool Type"
                    value={typeFilter}
                    onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)}
                >
                    <option value="All">All Types</option>
                    {TOOL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </Select>
                <Select
                    label="Tool Material"
                    value={materialFilter}
                    onChange={(e) => handleFilterChange(setMaterialFilter, e.target.value)}
                >
                    <option value="All">All Materials</option>
                    {TOOL_MATERIALS.map(mat => <option key={mat} value={mat}>{mat}</option>)}
                </Select>
                <div className="grid grid-cols-2 gap-2">
                    <Input
                        label="Min Dia (mm)"
                        type="number"
                        placeholder="Min"
                        value={minDiameter}
                        onChange={(e) => handleFilterChange(setMinDiameter, e.target.value)}
                    />
                    <Input
                        label="Max Dia (mm)"
                        type="number"
                        placeholder="Max"
                        value={maxDiameter}
                        onChange={(e) => handleFilterChange(setMaxDiameter, e.target.value)}
                    />
                </div>
            </div>
             <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={resetFilters}>Reset Filters</Button>
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Tool Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Brand</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Model</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Diameter (mm)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Price</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Est. Life (hrs)</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {paginatedTools.length > 0 ? paginatedTools.map((tool) => {
                const isDefault = DEFAULT_TOOL_IDS.has(tool.id);
                const canModify = !isDefault || isSuperAdmin;
                return (
                <tr key={tool.id} className="hover:bg-background/60">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-primary">
                      {tool.name}
                      {isDefault && <span className="ml-2 text-xs font-semibold rounded-full bg-surface text-text-secondary border border-border px-2 py-0.5">Default</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.brand}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.toolType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.diameter.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.price ? `${currencySymbol}${tool.price.toFixed(2)}` : 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.estimatedLife ?? 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Button variant="secondary" onClick={() => handleEdit(tool)} disabled={!canModify} title={!canModify ? "Default items cannot be modified" : ""}>Edit</Button>
                    <Button variant="secondary" onClick={() => handleDelete(tool)} disabled={!canModify} className={canModify ? "text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400" : ""} title={!canModify ? "Default items cannot be modified" : ""}>Delete</Button>
                  </td>
                </tr>
              )}) : (
                <tr>
                    <td colSpan={8} className="text-center py-10 text-text-secondary">
                        No tools found matching your criteria.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between">
            <div>
                <p className="text-sm text-text-secondary">
                    Showing <span className="font-medium">{filteredTools.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredTools.length)}</span> of{' '}
                    <span className="font-medium">{filteredTools.length}</span> results
                </p>
            </div>
            {totalPages > 1 && (
                <div className="flex space-x-2">
                    <Button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        variant="secondary"
                    >
                        Previous
                    </Button>
                    <Button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        variant="secondary"
                    >
                        Next
                    </Button>
                </div>
            )}
       </div>
      </Card>
    </div>
  );
};