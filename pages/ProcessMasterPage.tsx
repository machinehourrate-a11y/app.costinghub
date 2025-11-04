import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Process, ProcessParameter } from '../types';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { MACHINE_TYPES } from '../constants';

interface ProcessLibraryPageProps {
  processes: Process[];
}

interface RequestProcessModalProps {
  onClose: () => void;
}

const ITEMS_PER_PAGE = 10;

const RequestProcessModal: React.FC<RequestProcessModalProps> = ({ onClose }) => {
    const [requestDetails, setRequestDetails] = useState('');
    const recipient = 'support@costinghub.com';
    const subject = 'New Process Request';
    const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(requestDetails)}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
            <Card className="max-w-xl w-full relative">
                 <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h2 className="text-2xl font-bold text-primary mb-4">Request a New Process</h2>
                <p className="text-text-secondary mb-6">
                    Need a process that isn't on our list? Describe it below. Please include the process name, typical parameters you use for calculation, and any relevant formulas. Your request will be reviewed for inclusion in a future update.
                </p>
                <textarea
                    value={requestDetails}
                    onChange={(e) => setRequestDetails(e.target.value)}
                    placeholder="e.g., Process Name: Cylindrical Grinding. Parameters: Diameter, Length, Stock to Remove, Surface Finish. Formula: ..."
                    className="block w-full px-3 py-2 border rounded-md focus:outline-none sm:text-sm bg-background/50 text-text-input border-border placeholder-text-muted focus:ring-primary focus:border-primary"
                    rows={6}
                />
                <div className="flex justify-end space-x-4 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <a href={mailtoLink} target="_blank" rel="noopener noreferrer">
                        <Button>Send Request via Email</Button>
                    </a>
                </div>
            </Card>
        </div>
    );
};


export const ProcessLibraryPage: React.FC<ProcessLibraryPageProps> = ({ processes }) => {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Filters and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [machineTypeFilter, setMachineTypeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

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

  const resetFilters = () => {
    setSearchTerm('');
    setMachineTypeFilter('All');
    setCurrentPage(1);
  };
  
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredProcesses.length / ITEMS_PER_PAGE);
  const paginatedProcesses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProcesses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProcesses, currentPage]);

  return (
    <div className="w-full mx-auto space-y-8 animate-fade-in">
      {isRequestModalOpen && <RequestProcessModal onClose={() => setIsRequestModalOpen(false)} />}
      
      <Card>
        <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-primary">Process Library</h2>
          <Button onClick={() => setIsRequestModalOpen(true)}>+ Request New Process</Button>
        </div>
        
        {/* Filter Section */}
        <div className="p-4 bg-background/50 rounded-lg border border-border mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Input
                    label="Search Process Name"
                    placeholder="e.g., End Milling"
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

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Process Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Group</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Compatible Machine Types</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {paginatedProcesses.length > 0 ? paginatedProcesses.map((process) => (
                <tr 
                  key={process.id} 
                  className={`cursor-pointer ${selectedProcess?.id === process.id ? 'bg-primary/10' : 'hover:bg-background/60'}`}
                  onClick={() => setSelectedProcess(process)}
                >
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-primary">{process.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{process.group}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    <div className="flex flex-wrap gap-1 max-w-md">
                        {process.compatibleMachineTypes.length > 0 ? process.compatibleMachineTypes.map(p => (
                            <span key={p} className="px-2 py-1 text-xs font-semibold rounded-full bg-surface text-text-secondary border border-border">{p}</span>
                        )) : <span className="text-xs text-text-muted">None</span>}
                    </div>
                  </td>
                </tr>
              )) : (
                 <tr>
                    <td colSpan={3} className="text-center py-10 text-text-secondary">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <h4 className="text-md font-semibold text-text-secondary mb-2">Parameters</h4>
                    <div className="bg-background/50 border border-border rounded-lg p-3 space-y-2">
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
                </div>
                <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-text-secondary mb-2">Cycle Time Formula</h4>
                    <pre className="bg-background/50 border border-border rounded-lg p-4 text-sm text-primary whitespace-pre-wrap break-words font-mono">
                        {selectedProcess.formula || 'No formula defined.'}
                    </pre>
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
