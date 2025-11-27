import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Process, ProcessLibraryPageProps, ProcessParameter } from '../types';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { MACHINE_TYPES, DEFAULT_PROCESS_NAMES, SUPER_ADMIN_EMAILS } from '../constants';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ProcessModal } from '../components/ProcessModal';
import { MultiProcessModal } from '../components/MultiProcessModal';
import { RequestProcessModal } from '../components/RequestProcessModal';

const ITEMS_PER_PAGE = 10;

export const ProcessLibraryPage: React.FC<ProcessLibraryPageProps> = ({ 
    processes, user, onAddProcess, onUpdateProcess, onDeleteProcess, onAddMultipleProcesses, onDeleteMultipleProcesses
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [processToDelete, setProcessToDelete] = useState<Process | null>(null);

  // Filters and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [machineTypeFilter, setMachineTypeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  
  // State for bulk delete
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const isSuperAdmin = useMemo(() => SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()), [user.email]);

  // Memoized filtering logic
  const filteredProcesses = useMemo(() => {
    return processes.filter(process => {
      const lowercasedTerm = searchTerm.toLowerCase();
      const nameMatch = searchTerm === '' || process.name.toLowerCase().includes(lowercasedTerm);
      const machineTypeMatch = machineTypeFilter === 'All' || process.compatibleMachineTypes.includes(machineTypeFilter);
      return nameMatch && machineTypeMatch;
    });
  }, [processes, searchTerm, machineTypeFilter]);

  const [selectedProcess, setSelectedProcess] = useState<Process | null>(filteredProcesses[0] || processes[0] || null);

  const handleAddNew = () => {
    setEditingProcess(null);
    setIsModalOpen(true);
  };
  
  const handleEdit = (process: Process) => {
    setEditingProcess(process);
    setIsModalOpen(true);
  };
  
  const handleSaveProcess = (process: Process) => {
    if (editingProcess) {
      onUpdateProcess(process);
    } else {
      onAddProcess(process);
    }
    setIsModalOpen(false);
  };
  
  const handleDelete = (process: Process) => {
    setProcessToDelete(process);
  };

  const confirmDelete = () => {
    if (processToDelete) {
        onDeleteProcess(processToDelete.id);
        if (selectedProcess?.id === processToDelete.id) {
            setSelectedProcess(null);
        }
        setProcessToDelete(null);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setMachineTypeFilter('All');
    setCurrentPage(1);
  };
  
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setCurrentPage(1);
  };
  
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
        const selectableProcesses = paginatedProcesses
            .filter(p => !DEFAULT_PROCESS_NAMES.has(p.name) || isSuperAdmin);
            
        if (selectedIds.length === selectableProcesses.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(selectableProcesses.map(p => p.id));
        }
    };
    
    const confirmBulkDelete = () => {
        onDeleteMultipleProcesses(selectedIds);
        setIsBulkDeleteModalOpen(false);
        setSelectedIds([]);
        setIsSelectionMode(false);
    };

  // Pagination logic
  const totalPages = Math.ceil(filteredProcesses.length / ITEMS_PER_PAGE);
  const paginatedProcesses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProcesses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProcesses, currentPage]);
  
  const selectableProcesses = useMemo(() => 
      paginatedProcesses.filter(p => !DEFAULT_PROCESS_NAMES.has(p.name) || isSuperAdmin),
      [paginatedProcesses, isSuperAdmin]
  );

  return (
    <div className="w-full mx-auto space-y-8 animate-fade-in">
      {isModalOpen && <ProcessModal process={editingProcess} onSave={handleSaveProcess} onClose={() => setIsModalOpen(false)} isSuperAdmin={isSuperAdmin} />}
      {isMultiModalOpen && <MultiProcessModal onSave={(newProcs) => { onAddMultipleProcesses(newProcs); setIsMultiModalOpen(false); }} onClose={() => setIsMultiModalOpen(false)} />}
      {processToDelete && (
        <ConfirmationModal
          title="Delete Process"
          message={`Are you sure you want to delete "${processToDelete.name}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setProcessToDelete(null)}
        />
      )}
      {isRequestModalOpen && (
        <RequestProcessModal
            onClose={() => setIsRequestModalOpen(false)}
            onSubmitRequest={(details) => {
                alert(`Your request has been submitted:\n\n"${details}"\n\nOur team will review it shortly.`);
                setIsRequestModalOpen(false);
            }}
        />
      )}
      {isBulkDeleteModalOpen && (
          <ConfirmationModal
            title={`Delete ${selectedIds.length} Processes`}
            message={`Are you sure you want to delete the selected custom processes? This action cannot be undone.`}
            onConfirm={confirmBulkDelete}
            onCancel={() => setIsBulkDeleteModalOpen(false)}
          />
      )}
      
      <Card>
        <div className="border-b border-border pb-4 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary">Process Library</h2>
              <div className="flex items-center space-x-4">
                <Button variant="secondary" onClick={handleToggleSelectionMode}>
                  {isSelectionMode ? 'Cancel' : 'Select'}
                </Button>
                <Button onClick={handleAddNew}>+ Add New Process</Button>
                {isSuperAdmin ? (
                  <Button onClick={() => setIsMultiModalOpen(true)}>+ Add Multiple with AI</Button>
                ) : (
                  <Button onClick={() => setIsRequestModalOpen(true)}>+ Request New Process</Button>
                )}
              </div>
            </div>
            
            {/* Filter Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Input
                    label="Search Process Name"
                    placeholder="e.g., Face Milling"
                    value={searchTerm}
                    onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
                />
                <Select
                    label="Compatible Machine Type"
                    value={machineTypeFilter}
                    onChange={(e) => handleFilterChange(setMachineTypeFilter, e.target.value)}
                >
                    <option value="All">All Types</option>
                    {MACHINE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </Select>
                 <Button variant="secondary" onClick={resetFilters} className="self-end">Reset Filters</Button>
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
                            checked={selectableProcesses.length > 0 && selectedIds.length === selectableProcesses.length}
                            onChange={handleToggleSelectAll}
                        />
                    </th>
                )}
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Image</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Process Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Group</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Compatible Machine Types</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {paginatedProcesses.length > 0 ? paginatedProcesses.map((process) => {
                const isDefault = DEFAULT_PROCESS_NAMES.has(process.name);
                const canModify = !isDefault || isSuperAdmin;
                return (
                <tr 
                  key={process.id} 
                  className={`cursor-pointer ${selectedProcess?.id === process.id && !isSelectionMode ? 'bg-primary/10' : 'hover:bg-background/60'} ${selectedIds.includes(process.id) ? '!bg-primary/20' : ''}`}
                  onClick={() => {
                      if (isSelectionMode && canModify) {
                          handleToggleSelection(process.id);
                      } else if (!isSelectionMode) {
                          setSelectedProcess(process);
                      }
                  }}
                >
                  {isSelectionMode && (
                      <td className="px-4 py-4">
                          <input
                              type="checkbox"
                              checked={selectedIds.includes(process.id)}
                              onChange={() => handleToggleSelection(process.id)}
                              disabled={!canModify}
                              className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary disabled:opacity-50"
                          />
                      </td>
                  )}
                  <td className="px-4 py-4">
                      <div className="h-12 w-16 bg-white rounded-md border border-border flex items-center justify-center">
                         {process.imageUrl ? (
                            <img src={process.imageUrl} alt={process.name} className="h-full w-full object-contain p-1" />
                         ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                         )}
                      </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-primary">
                      {process.name}
                      {isDefault && <span className="ml-2 text-xs font-semibold rounded-full bg-surface text-text-secondary border border-border px-2 py-0.5">Default</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{process.group}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    <div className="flex flex-wrap gap-1 max-w-md">
                        {process.compatibleMachineTypes.length > 0 ? process.compatibleMachineTypes.map(p => (
                            <span key={p} className="px-2 py-1 text-xs font-semibold rounded-full bg-surface text-text-secondary border border-border">{p}</span>
                        )) : <span className="text-xs text-text-muted">None</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); handleEdit(process); }} disabled={!canModify} title={!canModify ? "Default processes cannot be modified." : ""}>Edit</Button>
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); handleDelete(process); }} className={canModify ? "text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400" : ""} disabled={!canModify} title={!canModify ? "Default processes cannot be deleted." : ""}>Delete</Button>
                  </td>
                </tr>
              )}) : (
                 <tr>
                    <td colSpan={isSelectionMode ? 6 : 5} className="text-center py-10 text-text-secondary">
                        No processes found matching your criteria.
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
                    Showing <span className="font-medium">{filteredProcesses.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProcesses.length)}</span> of{' '}
                    <span className="font-medium">{filteredProcesses.length}</span> results
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

      {selectedProcess ? (
        <Card>
            <h3 className="text-xl font-bold text-primary mb-4">{selectedProcess.name} Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div>
                    <h4 className="text-md font-semibold text-text-secondary mb-2">Illustration</h4>
                    <div className="aspect-[4/3] bg-white rounded-lg border border-border flex items-center justify-center overflow-hidden">
                        {selectedProcess.imageUrl ? (
                             <img src={selectedProcess.imageUrl} alt={selectedProcess.name} className="h-full w-full object-contain p-2"/>
                        ) : (
                            <span className="text-text-muted text-sm">No Image</span>
                        )}
                    </div>
                </div>
                <div>
                    <h4 className="text-md font-semibold text-text-secondary mb-2">Parameters</h4>
                    <div className="bg-background/50 border border-border rounded-lg p-3 space-y-2 mb-4">
                        {(selectedProcess.parameters as ProcessParameter[]).length > 0 ? (
                            (selectedProcess.parameters as ProcessParameter[]).map(param => (
                                <div key={param.name} className="flex justify-between items-center text-sm">
                                    <span className="font-mono text-text-primary bg-surface px-2 py-1 rounded-md border border-border">{param.name}</span>
                                    <span className="text-text-secondary">{param.label} ({param.unit})</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-text-muted">No specific parameters for this process.</p>
                        )}
                    </div>
                    
                    {isSuperAdmin && (
                        <>
                            <h4 className="text-md font-semibold text-text-secondary mb-2">Cycle Time Formula</h4>
                            <pre className="bg-background/50 border border-border rounded-lg p-4 text-sm text-primary whitespace-pre-wrap break-words font-mono">
                                {selectedProcess.formula || 'No formula defined.'}
                            </pre>
                        </>
                    )}
                </div>
            </div>
        </Card>
      ) : (
        <Card>
            <p className="text-text-secondary text-center p-4">Select a process from the list to view its details.</p>
        </Card>
      )}
    </div>
  );
};