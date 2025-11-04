import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { MachineModal } from '../components/MachineModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import type { Machine, MachineLibraryPageProps } from '../types';
import { MultiMachineModal } from '../components/MultiMachineModal';
import { MACHINE_TYPES, DEFAULT_MACHINE_IDS, SUPER_ADMIN_EMAILS } from '../constants';

const ITEMS_PER_PAGE = 10;

export const MachineLibraryPage: React.FC<MachineLibraryPageProps> = ({ user, machines, onAddMachine, onUpdateMachine, onDeleteMachine, onAddMultipleMachines }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);

  // Filters and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [minX, setMinX] = useState('');
  const [maxX, setMaxX] = useState('');
  const [minY, setMinY] = useState('');
  const [maxY, setMaxY] = useState('');
  const [minZ, setMinZ] = useState('');
  const [maxZ, setMaxZ] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
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
        const lowercasedTerm = searchTerm.toLowerCase();
        const searchMatch = searchTerm === '' ||
            machine.name.toLowerCase().includes(lowercasedTerm) ||
            machine.brand.toLowerCase().includes(lowercasedTerm) ||
            machine.model.toLowerCase().includes(lowercasedTerm);

        const typeMatch = typeFilter === 'All' || machine.machineType === typeFilter;

        const checkRange = (value: number, min: string, max: string) => {
            const minVal = parseFloat(min);
            const maxVal = parseFloat(max);
            const minMatch = isNaN(minVal) || value >= minVal;
            const maxMatch = isNaN(maxVal) || value <= maxVal;
            return minMatch && maxMatch;
        };
        
        const xMatch = checkRange(machine.xAxis, minX, maxX);
        const yMatch = checkRange(machine.yAxis, minY, maxY);
        const zMatch = checkRange(machine.zAxis, minZ, maxZ);

        return searchMatch && typeMatch && xMatch && yMatch && zMatch;
    });
  }, [machines, searchTerm, typeFilter, minX, maxX, minY, maxY, minZ, maxZ]);
  
  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('All');
    setMinX('');
    setMaxX('');
    setMinY('');
    setMaxY('');
    setMinZ('');
    setMaxZ('');
    setCurrentPage(1);
  };
  
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
      setter(value);
      setCurrentPage(1);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredMachines.length / ITEMS_PER_PAGE);
  const paginatedMachines = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMachines.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMachines, currentPage]);


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
      
      <Card>
        <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-primary">Your Machines</h2>
          <div className="flex items-center space-x-4">
            <Button onClick={handleAddNew}>+ Add New Machine</Button>
            <Button onClick={() => setIsMultiModalOpen(true)}>+ Add Multiple with AI</Button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="p-4 bg-background/50 rounded-lg border border-border mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="lg:col-span-2">
                    <Input
                        label="Search Name, Brand or Model"
                        placeholder="e.g., HAAS VF-2"
                        value={searchTerm}
                        onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
                    />
                </div>
                <Select
                    label="Machine Type"
                    value={typeFilter}
                    onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)}
                >
                    <option value="All">All Types</option>
                    {MACHINE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </Select>
                 <Button variant="secondary" onClick={resetFilters} className="self-end">Reset Filters</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
                <Input label="Min X (mm)" type="number" placeholder="Min" value={minX} onChange={(e) => handleFilterChange(setMinX, e.target.value)} />
                <Input label="Max X (mm)" type="number" placeholder="Max" value={maxX} onChange={(e) => handleFilterChange(setMaxX, e.target.value)} />
                <Input label="Min Y (mm)" type="number" placeholder="Min" value={minY} onChange={(e) => handleFilterChange(setMinY, e.target.value)} />
                <Input label="Max Y (mm)" type="number" placeholder="Max" value={maxY} onChange={(e) => handleFilterChange(setMaxY, e.target.value)} />
                <Input label="Min Z (mm)" type="number" placeholder="Min" value={minZ} onChange={(e) => handleFilterChange(setMinZ, e.target.value)} />
                <Input label="Max Z (mm)" type="number" placeholder="Max" value={maxZ} onChange={(e) => handleFilterChange(setMaxZ, e.target.value)} />
            </div>
        </div>


        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Machine Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Brand</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Model</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Rate ($/hr)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Work Envelope (mm)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Power (kW)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Add. Axis</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {paginatedMachines.length > 0 ? paginatedMachines.map((machine) => {
                const isDefault = DEFAULT_MACHINE_IDS.has(machine.id);
                const canModify = !isDefault || isSuperAdmin;
                return (
                  <tr key={machine.id} className="hover:bg-background/60">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-primary">
                      {machine.name}
                      {isDefault && <span className="ml-2 text-xs font-semibold rounded-full bg-surface text-text-secondary border border-border px-2 py-0.5">Default</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{machine.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{machine.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">${machine.hourlyRate.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{machine.machineType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{`${machine.xAxis} x ${machine.yAxis} x ${machine.zAxis}`}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{machine.powerKw}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{machine.additionalAxis}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Button variant="secondary" onClick={() => handleEdit(machine)} disabled={!canModify} title={!canModify ? "Default items cannot be modified" : ""}>Edit</Button>
                      <Button variant="secondary" onClick={() => handleDelete(machine)} disabled={!canModify} className={canModify ? "text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400" : ""} title={!canModify ? "Default items cannot be modified" : ""}>Delete</Button>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                    <td colSpan={9} className="text-center py-10 text-text-secondary">
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

      </Card>
    </div>
  );
};
