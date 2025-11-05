
import React, { useState, useMemo, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { MachineModal } from '../components/MachineModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import type { Machine, MachineLibraryPageProps } from '../types';
import { MultiMachineModal } from '../components/MultiMachineModal';
import { MACHINE_TYPES, DEFAULT_MACHINE_IDS, SUPER_ADMIN_EMAILS, ADDITIONAL_AXIS_OPTIONS } from '../constants';
import { FilterPopover } from '../components/FilterPopover';
import { FilterIcon } from '../components/ui/FilterIcon';

const ITEMS_PER_PAGE = 10;

export const MachineLibraryPage: React.FC<MachineLibraryPageProps> = ({ user, machines, onAddMachine, onUpdateMachine, onDeleteMachine, onAddMultipleMachines, onDeleteMultipleMachines }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);

  // Filters and pagination state
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [activePopover, setActivePopover] = useState<{ column: string; anchorEl: HTMLElement } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // State for bulk delete
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  
  const filterRefs = {
      name: useRef<HTMLButtonElement>(null),
      machineType: useRef<HTMLButtonElement>(null),
      hourlyRate: useRef<HTMLButtonElement>(null),
      powerKw: useRef<HTMLButtonElement>(null),
      additionalAxis: useRef<HTMLButtonElement>(null),
  };

  const isSuperAdmin = useMemo(() => SUPER_ADMIN_EMAILS.includes(user.email), [user.email]);
  
  const handleAddNew = () => {
    setEditingMachine(null);
    setIsModalOpen(true);
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setIsModalOpen(true);
  };

  const handleDelete = (machine: Machine) => {
    setMachineToDelete(machine);
  };

  const confirmDelete = () => {
    if (machineToDelete) {
      onDeleteMachine(machineToDelete.id);
      setMachineToDelete(null);
    }
  };

  const handleSaveMachine = (machine: Machine) => {
    if (editingMachine) {
      onUpdateMachine(machine);
    } else {
      onAddMachine(machine);
    }
    setIsModalOpen(false);
  };

  // Memoized filtering logic
  const filteredMachines = useMemo(() => {
    return machines.filter(machine => {
      const nameMatch = !filters.name || (machine.name.toLowerCase().includes(filters.name.toLowerCase()) || machine.brand.toLowerCase().includes(filters.name.toLowerCase()) || machine.model.toLowerCase().includes(filters.name.toLowerCase()));
      const typeMatch = !filters.machineType?.length || filters.machineType.includes(machine.machineType);
      const axisMatch = !filters.additionalAxis?.length || filters.additionalAxis.includes(machine.additionalAxis);
      
      const rateMatch = 
          (filters.minHourlyRate === undefined || machine.hourlyRate >= filters.minHourlyRate) &&
          (filters.maxHourlyRate === undefined || machine.hourlyRate <= filters.maxHourlyRate);

      const powerMatch = 
          (filters.minPowerKw === undefined || machine.powerKw >= filters.minPowerKw) &&
          (filters.maxPowerKw === undefined || machine.powerKw <= filters.maxPowerKw);

      return nameMatch && typeMatch && axisMatch && rateMatch && powerMatch;
    });
  }, [machines, filters]);
  
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
        if (column === 'hourlyRate') {
            delete newFilters.minHourlyRate;
            delete newFilters.maxHourlyRate;
        }
        if (column === 'powerKw') {
            delete newFilters.minPowerKw;
            delete newFilters.maxPowerKw;
        }
        setFilters(newFilters);
        setActivePopover(null);
        setCurrentPage(1);
    }

  // Pagination logic
  const totalPages = Math.ceil(filteredMachines.length / ITEMS_PER_PAGE);
  const paginatedMachines = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMachines.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMachines, currentPage]);

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
      if (selectedIds.length === paginatedMachines.filter(m => !DEFAULT_MACHINE_IDS.has(m.id) || isSuperAdmin).length) {
          setSelectedIds([]);
      } else {
          const selectableIds = paginatedMachines
              .filter(m => !DEFAULT_MACHINE_IDS.has(m.id) || isSuperAdmin)
              .map(m => m.id);
          setSelectedIds(selectableIds);
      }
  };
  
  const confirmBulkDelete = () => {
      onDeleteMultipleMachines(selectedIds);
      setIsBulkDeleteModalOpen(false);
      setSelectedIds([]);
      setIsSelectionMode(false);
  };


  return (
    <div className="w-full mx-auto space-y-8 animate-fade-in">
      {isModalOpen && (
        <MachineModal 
          machine={editingMachine} 
          onSave={handleSaveMachine} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
      {isMultiModalOpen && (
        <MultiMachineModal
          onClose={() => setIsMultiModalOpen(false)}
          onSave={(newMachines) => {
            onAddMultipleMachines(newMachines);
            setIsMultiModalOpen(false);
          }}
        />
      )}
      {machineToDelete && (
        <ConfirmationModal
          title="Delete Machine"
          message={`Are you sure you want to delete "${machineToDelete.name}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setMachineToDelete(null)}
        />
      )}
      {isBulkDeleteModalOpen && (
          <ConfirmationModal
              title={`Delete ${selectedIds.length} Machines`}
              message={`Are you sure you want to delete the selected machines? This action cannot be undone.`}
              onConfirm={confirmBulkDelete}
              onCancel={() => setIsBulkDeleteModalOpen(false)}
          />
      )}
      
      <Card>
        <div className="border-b border-border pb-4 mb-6 flex justify-between items-center gap-4">
            <h2 className="text-2xl font-bold text-primary flex-shrink-0">Machine Library</h2>
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
                            checked={paginatedMachines.length > 0 && selectedIds.length === paginatedMachines.filter(m => !DEFAULT_MACHINE_IDS.has(m.id) || isSuperAdmin).length}
                            onChange={handleToggleSelectAll}
                        />
                    </th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    <div className="flex items-center gap-2">Machine Name <button ref={filterRefs.name} onClick={() => setActivePopover({ column: 'name', anchorEl: filterRefs.name.current! })}><FilterIcon isActive={!!filters.name} /></button></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    <div className="flex items-center gap-2">Type <button ref={filterRefs.machineType} onClick={() => setActivePopover({ column: 'machineType', anchorEl: filterRefs.machineType.current! })}><FilterIcon isActive={!!filters.machineType?.length} /></button></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    <div className="flex items-center gap-2">Rate ($/hr) <button ref={filterRefs.hourlyRate} onClick={() => setActivePopover({ column: 'hourlyRate', anchorEl: filterRefs.hourlyRate.current! })}><FilterIcon isActive={filters.minHourlyRate !== undefined || filters.maxHourlyRate !== undefined} /></button></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Work Envelope (mm)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    <div className="flex items-center gap-2">Power (kW) <button ref={filterRefs.powerKw} onClick={() => setActivePopover({ column: 'powerKw', anchorEl: filterRefs.powerKw.current! })}><FilterIcon isActive={filters.minPowerKw !== undefined || filters.maxPowerKw !== undefined} /></button></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    <div className="flex items-center gap-2">Add. Axis <button ref={filterRefs.additionalAxis} onClick={() => setActivePopover({ column: 'additionalAxis', anchorEl: filterRefs.additionalAxis.current! })}><FilterIcon isActive={!!filters.additionalAxis?.length} /></button></div>
                </th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {paginatedMachines.length > 0 ? paginatedMachines.map((machine) => {
                const isDefault = DEFAULT_MACHINE_IDS.has(machine.id);
                const canModify = !isDefault || isSuperAdmin;
                return (
                  <tr key={machine.id} className={`cursor-pointer hover:bg-background/60 ${selectedIds.includes(machine.id) ? '!bg-primary/20' : ''}`} onClick={() => { if(isSelectionMode && canModify) handleToggleSelection(machine.id)}}>
                    {isSelectionMode && (
                        <td className="px-4 py-4">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(machine.id)}
                                onChange={() => handleToggleSelection(machine.id)}
                                disabled={!canModify}
                                className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary disabled:opacity-50"
                            />
                        </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-primary">
                      {machine.name}
                      {isDefault && <span className="ml-2 text-xs font-semibold rounded-full bg-surface text-text-secondary border border-border px-2 py-0.5">Default</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{machine.machineType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">${machine.hourlyRate.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{`${machine.xAxis} x ${machine.yAxis} x ${machine.zAxis}`}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{machine.powerKw}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{machine.additionalAxis}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Button variant="secondary" onClick={(e) => { e.stopPropagation(); handleEdit(machine); }} disabled={!canModify} title={!canModify ? "Default items cannot be modified" : ""}>Edit</Button>
                      <Button variant="secondary" onClick={(e) => { e.stopPropagation(); handleDelete(machine); }} disabled={!canModify} className={canModify ? "text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400" : ""} title={!canModify ? "Default items cannot be modified" : ""}>Delete</Button>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                    <td colSpan={isSelectionMode ? 8 : 7} className="text-center py-10 text-text-secondary">
                        No machines found matching your criteria.
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
                    Showing <span className="font-medium">{filteredMachines.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredMachines.length)}</span> of{' '}
                    <span className="font-medium">{filteredMachines.length}</span> results
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
    if (column === 'machineType' || column === 'additionalAxis') {
        const options = column === 'machineType' ? MACHINE_TYPES : ADDITIONAL_AXIS_OPTIONS;
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
    if (column === 'hourlyRate' || column === 'powerKw') {
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
