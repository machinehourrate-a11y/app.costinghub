
import React, { useState, useMemo, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ToolModal } from '../components/ToolModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import type { Tool, ToolLibraryPageProps } from '../types';
import { MultiToolModal } from '../components/MultiToolModal';
import { TOOL_TYPES, TOOL_MATERIALS, DEFAULT_TOOL_IDS, SUPER_ADMIN_EMAILS } from '../constants';
import { FilterPopover } from '../components/FilterPopover';
import { FilterIcon } from '../components/ui/FilterIcon';

const currencySymbols: { [key: string]: string } = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

const ITEMS_PER_PAGE = 10;

export const ToolLibraryPage: React.FC<ToolLibraryPageProps> = ({ user, tools, onAddTool, onUpdateTool, onDeleteTool, onAddMultipleTools, onDeleteMultipleTools }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [toolToDelete, setToolToDelete] = useState<Tool | null>(null);
  
  // Filters and pagination state
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [activePopover, setActivePopover] = useState<{ column: string; anchorEl: HTMLElement } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const filterRefs = {
      name: useRef<HTMLButtonElement>(null),
      toolType: useRef<HTMLButtonElement>(null),
      material: useRef<HTMLButtonElement>(null),
      diameter: useRef<HTMLButtonElement>(null),
      price: useRef<HTMLButtonElement>(null),
      estimatedLife: useRef<HTMLButtonElement>(null),
  };

  // State for bulk delete
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  
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
        const nameMatch = !filters.name || tool.name.toLowerCase().includes(filters.name.toLowerCase());
        const typeMatch = !filters.toolType?.length || filters.toolType.includes(tool.toolType);
        const materialMatch = !filters.material?.length || filters.material.includes(tool.material);
        
        const diameterMatch = 
            (filters.minDiameter === undefined || tool.diameter >= filters.minDiameter) &&
            (filters.maxDiameter === undefined || tool.diameter <= filters.maxDiameter);

        const priceMatch = 
            (filters.minPrice === undefined || tool.price === null || tool.price >= filters.minPrice) &&
            (filters.maxPrice === undefined || tool.price === null || tool.price <= filters.maxPrice);
            
        const lifeMatch = 
            (filters.minEstimatedLife === undefined || tool.estimatedLife === null || tool.estimatedLife >= filters.minEstimatedLife) &&
            (filters.maxEstimatedLife === undefined || tool.estimatedLife === null || tool.estimatedLife <= filters.maxEstimatedLife);

        return nameMatch && typeMatch && materialMatch && diameterMatch && priceMatch && lifeMatch;
    });
  }, [tools, filters]);

  const resetFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };
  
    const handleApplyFilter = (column: string, value: any) => {
        setFilters(prev => ({...prev, [column]: value}));
        setActivePopover(null);
        setCurrentPage(1);
    };
    
    const handleClearFilter = (column: string) => {
        const newFilters = {...filters};
        delete newFilters[column];
        if (column === 'diameter') { delete newFilters.minDiameter; delete newFilters.maxDiameter; }
        if (column === 'price') { delete newFilters.minPrice; delete newFilters.maxPrice; }
        if (column === 'estimatedLife') { delete newFilters.minEstimatedLife; delete newFilters.maxEstimatedLife; }
        setFilters(newFilters);
        setActivePopover(null);
        setCurrentPage(1);
    }

  // Pagination logic
  const totalPages = Math.ceil(filteredTools.length / ITEMS_PER_PAGE);
  const paginatedTools = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTools.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTools, currentPage]);

  // --- Bulk Delete Handlers ---
  const handleToggleSelectionMode = () => {
      setIsSelectionMode(prev => !prev);
      setSelectedIds([]);
  };

  const handleToggleSelection = (id: string) => {
      setSelectedIds(prev =>
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };
  
  const handleToggleSelectAll = () => {
      if (selectedIds.length === paginatedTools.filter(t => !DEFAULT_TOOL_IDS.has(t.id) || isSuperAdmin).length) {
          setSelectedIds([]);
      } else {
          const selectableIds = paginatedTools
              .filter(t => !DEFAULT_TOOL_IDS.has(t.id) || isSuperAdmin)
              .map(t => t.id);
          setSelectedIds(selectableIds);
      }
  };
  
  const confirmBulkDelete = () => {
      onDeleteMultipleTools(selectedIds);
      setIsBulkDeleteModalOpen(false);
      setSelectedIds([]);
      setIsSelectionMode(false);
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
      {isBulkDeleteModalOpen && (
          <ConfirmationModal
              title={`Delete ${selectedIds.length} Tools`}
              message={`Are you sure you want to delete the selected tools? This action cannot be undone.`}
              onConfirm={confirmBulkDelete}
              onCancel={() => setIsBulkDeleteModalOpen(false)}
          />
      )}
      
      <Card>
        <div className="border-b border-border pb-4 mb-6 flex justify-between items-center gap-4">
            <h2 className="text-2xl font-bold text-primary flex-shrink-0">Tool Library</h2>
            <div className="flex items-center space-x-2 flex-shrink-0">
                <Button variant="secondary" onClick={resetFilters}>Reset Filters</Button>
                <Button variant="secondary" onClick={handleToggleSelectionMode}>
                  {isSelectionMode ? 'Cancel' : 'Select'}
                </Button>
                <Button onClick={handleAddNew}>+ Add New</Button>
                <Button onClick={() => setIsMultiModalOpen(true)}>+ Add Multiple</Button>
            </div>
        </div>
        
        {isSelectionMode && (
            <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg mb-4 border border-primary/20">
                <span className="font-semibold text-primary">{selectedIds.length} item(s) selected</span>
                <div>
                    <Button 
                        variant="secondary" 
                        className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                        onClick={() => setIsBulkDeleteModalOpen(true)}
                        disabled={selectedIds.length === 0}
                    >
                        Delete Selected
                    </Button>
                </div>
            </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background/50">
              <tr>
                {isSelectionMode && (
                    <th scope="col" className="px-4 py-3 w-12">
                        <input
                            type="checkbox"
                            className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary"
                            checked={paginatedTools.length > 0 && selectedIds.length === paginatedTools.filter(t => !DEFAULT_TOOL_IDS.has(t.id) || isSuperAdmin).length}
                            onChange={handleToggleSelectAll}
                        />
                    </th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    <div className="flex items-center gap-2">Tool Name <button ref={filterRefs.name} onClick={() => setActivePopover({ column: 'name', anchorEl: filterRefs.name.current! })}><FilterIcon isActive={!!filters.name} /></button></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    <div className="flex items-center gap-2">Type <button ref={filterRefs.toolType} onClick={() => setActivePopover({ column: 'toolType', anchorEl: filterRefs.toolType.current! })}><FilterIcon isActive={!!filters.toolType?.length} /></button></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    <div className="flex items-center gap-2">Material <button ref={filterRefs.material} onClick={() => setActivePopover({ column: 'material', anchorEl: filterRefs.material.current! })}><FilterIcon isActive={!!filters.material?.length} /></button></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    <div className="flex items-center gap-2">Diameter (mm) <button ref={filterRefs.diameter} onClick={() => setActivePopover({ column: 'diameter', anchorEl: filterRefs.diameter.current! })}><FilterIcon isActive={filters.minDiameter !== undefined || filters.maxDiameter !== undefined} /></button></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    <div className="flex items-center gap-2">Price <button ref={filterRefs.price} onClick={() => setActivePopover({ column: 'price', anchorEl: filterRefs.price.current! })}><FilterIcon isActive={filters.minPrice !== undefined || filters.maxPrice !== undefined} /></button></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    <div className="flex items-center gap-2">Est. Life (hrs) <button ref={filterRefs.estimatedLife} onClick={() => setActivePopover({ column: 'estimatedLife', anchorEl: filterRefs.estimatedLife.current! })}><FilterIcon isActive={filters.minEstimatedLife !== undefined || filters.maxEstimatedLife !== undefined} /></button></div>
                </th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {paginatedTools.length > 0 ? paginatedTools.map((tool) => {
                const isDefault = DEFAULT_TOOL_IDS.has(tool.id);
                const canModify = !isDefault || isSuperAdmin;
                return (
                <tr key={tool.id} className={`cursor-pointer hover:bg-background/60 ${selectedIds.includes(tool.id) ? '!bg-primary/20' : ''}`} onClick={() => { if(isSelectionMode && canModify) handleToggleSelection(tool.id)}}>
                  {isSelectionMode && (
                      <td className="px-4 py-4">
                          <input
                              type="checkbox"
                              checked={selectedIds.includes(tool.id)}
                              onChange={() => handleToggleSelection(tool.id)}
                              disabled={!canModify}
                              className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary disabled:opacity-50"
                          />
                      </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-primary">
                      {tool.name}
                      {isDefault && <span className="ml-2 text-xs font-semibold rounded-full bg-surface text-text-secondary border border-border px-2 py-0.5">Default</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.toolType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.material}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.diameter.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.price ? `${currencySymbol}${tool.price.toFixed(2)}` : 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tool.estimatedLife ?? 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); handleEdit(tool); }} disabled={!canModify} title={!canModify ? "Default items cannot be modified" : ""}>Edit</Button>
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); handleDelete(tool); }} disabled={!canModify} className={canModify ? "text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400" : ""} title={!canModify ? "Default items cannot be modified" : ""}>Delete</Button>
                  </td>
                </tr>
              )}) : (
                <tr>
                    <td colSpan={isSelectionMode ? 8 : 7} className="text-center py-10 text-text-secondary">
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

        {activePopover?.column && (
            <FilterPopover 
                anchorEl={activePopover.anchorEl} 
                onClose={() => setActivePopover(null)} 
                title={`Filter by ${activePopover.column.replace(/([A-Z])/g, ' $1')}`}
            >
                <FilterContent
                    column={activePopover.column}
                    filters={filters}
                    onApplyFilter={handleApplyFilter}
                    onClearFilter={handleClearFilter}
                />
            </FilterPopover>
        )}
      </Card>
    </div>
  );
};


// A component to render the content of the filter popover
const FilterContent: React.FC<{column: string; filters: Record<string, any>; onApplyFilter: (col: string, val: any) => void; onClearFilter: (col: string) => void;}> = ({ column, filters, onApplyFilter, onClearFilter }) => {
    
    // Checkbox filter for categorical data
    if (column === 'toolType' || column === 'material') {
        const options = column === 'toolType' ? TOOL_TYPES : TOOL_MATERIALS;
        const [selected, setSelected] = useState(filters[column] || []);
        const handleToggle = (option: string) => {
            setSelected((prev: string[]) => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]);
        }
        return (
            <div className="space-y-2">
                <div className="max-h-48 overflow-y-auto space-y-1">
                    {options.map(option => (
                        <label key={option} className="flex items-center space-x-2 p-1 rounded hover:bg-background cursor-pointer">
                            <input type="checkbox" checked={selected.includes(option)} onChange={() => handleToggle(option)} className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary" />
                            <span>{option}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="secondary" className="!px-3 !py-1 text-xs" onClick={() => onClearFilter(column)}>Clear</Button>
                    <Button className="!px-3 !py-1 text-xs" onClick={() => onApplyFilter(column, selected)}>Apply</Button>
                </div>
            </div>
        )
    }
    
    // Range filter for numeric data
    if (['diameter', 'price', 'estimatedLife'].includes(column)) {
        const minKey = `min${column.charAt(0).toUpperCase() + column.slice(1)}`;
        const maxKey = `max${column.charAt(0).toUpperCase() + column.slice(1)}`;
        const [min, setMin] = useState(filters[minKey] || '');
        const [max, setMax] = useState(filters[maxKey] || '');
        
        const handleApply = () => {
             onApplyFilter(minKey, min !== '' ? parseFloat(min) : undefined);
             onApplyFilter(maxKey, max !== '' ? parseFloat(max) : undefined);
        }
        
        return (
             <div className="space-y-2">
                <Input label="Min" type="number" value={min} onChange={e => setMin(e.target.value)} />
                <Input label="Max" type="number" value={max} onChange={e => setMax(e.target.value)} />
                 <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="secondary" className="!px-3 !py-1 text-xs" onClick={() => onClearFilter(column)}>Clear</Button>
                    <Button className="!px-3 !py-1 text-xs" onClick={handleApply}>Apply</Button>
                </div>
            </div>
        )
    }

    // Default text filter
    const [value, setValue] = useState(filters[column] || '');
    return (
        <div className="space-y-2">
            <Input label="" placeholder={`Search ${column}...`} value={value} onChange={e => setValue(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="secondary" className="!px-3 !py-1 text-xs" onClick={() => onClearFilter(column)}>Clear</Button>
                <Button className="!px-3 !py-1 text-xs" onClick={() => onApplyFilter(column, value)}>Apply</Button>
            </div>
        </div>
    )
}
