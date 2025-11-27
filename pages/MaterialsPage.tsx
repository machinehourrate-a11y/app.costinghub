import React, { useState, useMemo, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MaterialChart } from '../components/MaterialChart';
import { MaterialComparison } from '../components/MaterialComparison';
import type { MaterialMasterItem, MaterialsPageProps, MaterialProperty, User } from '../types';
import { MaterialModal } from '../components/MaterialModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { MultiMaterialModal } from '../components/MultiMaterialModal';
import { SUPER_ADMIN_EMAILS } from '../constants';
import { FilterPopover } from '../components/FilterPopover';
import { FilterIcon } from '../components/ui/FilterIcon';
import { Input } from '../components/ui/Input';

const ITEMS_PER_PAGE = 10;

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

const renderMaterialProperty = (property: unknown): string => {
  if (
    property &&
    typeof property === 'object' &&
    'value' in property &&
    'unit' in property
  ) {
    const prop = property as { value: any, unit: any };
    if (prop.value === null || prop.value === undefined || prop.value === '' || prop.value === "N/A") {
      return 'N/A';
    }
    return `${prop.value} ${prop.unit || ''}`.trim();
  }
  return 'N/A';
};

export const MaterialsPage: React.FC<MaterialsPageProps> = ({ materials, user, onAddMaterial, onUpdateMaterial, onDeleteMaterial, onAddMultipleMaterials, onDeleteMultipleMaterials }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<MaterialMasterItem | null>(null);
    const [materialToDelete, setMaterialToDelete] = useState<MaterialMasterItem | null>(null);
    const [selectedMaterial, setSelectedMaterial] = useState<MaterialMasterItem | null>(materials[0] || null);
    
    // Comparison state
    const [comparingMaterials, setComparingMaterials] = useState<MaterialMasterItem[]>([]);
    const [isComparisonMode, setIsComparisonMode] = useState(false);

    // Filters and pagination state
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [activePopover, setActivePopover] = useState<{ column: string; anchorEl: HTMLElement } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    // Refs for popover anchors
    const filterRefs = {
        name: useRef<HTMLButtonElement>(null),
        category: useRef<HTMLButtonElement>(null),
        subCategory: useRef<HTMLButtonElement>(null),
        density: useRef<HTMLButtonElement>(null),
    };

    // State for bulk delete
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    
    const isSuperAdmin = useMemo(() => SUPER_ADMIN_EMAILS.includes(user.email), [user.email]);
    
    const allProperties = useMemo(() => {
        const props = new Set<string>();
        materials.forEach(m => {
            if(m.properties && typeof m.properties === 'object' && !Array.isArray(m.properties)){
                Object.keys(m.properties).forEach(p => props.add(p));
            }
        });
        return Array.from(props).sort();
    }, [materials]);

    const handleAddNew = () => {
        setEditingMaterial(null);
        setIsModalOpen(true);
    };

    const handleEdit = (material: MaterialMasterItem) => {
        setEditingMaterial(material);
        setIsModalOpen(true);
    };

    const handleDelete = (material: MaterialMasterItem) => {
        setMaterialToDelete(material);
    };

    const confirmDelete = () => {
        if (materialToDelete) {
            onDeleteMaterial(materialToDelete.id);
            setMaterialToDelete(null);
            if (selectedMaterial?.id === materialToDelete.id) {
                setSelectedMaterial(materials.filter(m => m.id !== materialToDelete.id)[0] || null);
            }
        }
    };

    const handleSaveMaterial = (material: MaterialMasterItem) => {
        if (editingMaterial) {
            onUpdateMaterial(material);
        } else {
            onAddMaterial(material);
        }
        setIsModalOpen(false);
    };

    const handleAddMultiple = (newMaterials: Omit<MaterialMasterItem, 'id'|'user_id'|'created_at'>[]) => {
        onAddMultipleMaterials(newMaterials);
        setIsMultiModalOpen(false);
    };

    const handleToggleCompare = (material: MaterialMasterItem) => {
        setComparingMaterials(prev => {
            if (prev.some(m => m.id === material.id)) {
                return prev.filter(m => m.id !== material.id);
            }
            if(prev.length < 6) {
                return [...prev, material];
            }
            return prev;
        });
    };
    
    const filteredMaterials = useMemo(() => {
        return materials.filter(material => {
            const nameMatch = !filters.name || material.name.toLowerCase().includes(filters.name.toLowerCase());
            const categoryMatch = !filters.category?.length || filters.category.includes(material.category);
            const subCategoryMatch = !filters.subCategory || (material.subCategory && material.subCategory.toLowerCase().includes(filters.subCategory.toLowerCase()));
            
            const densityProp = (material.properties as any)['Density'];
            const densityString = densityProp ? `${densityProp.value}` : '';
            const densityMatch = !filters.densitySearch || (densityString && densityString.includes(filters.densitySearch));
            
            return nameMatch && categoryMatch && subCategoryMatch && densityMatch;
        });
    }, [materials, filters]);

    const resetFilters = () => {
        setFilters({});
        setCurrentPage(1);
    };
    
    const handleApplyFilters = (updates: Record<string, any>) => {
        setFilters(prev => ({ ...prev, ...updates }));
        setActivePopover(null);
        setCurrentPage(1);
    };

    const handleClearFilters = (keys: string[]) => {
        const newFilters = { ...filters };
        keys.forEach(key => delete newFilters[key]);
        setFilters(newFilters);
        setActivePopover(null);
    };

    const uniqueCategories = useMemo(() => [...new Set(materials.map(m => m.category))].sort(), [materials]);

    const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);
    const paginatedMaterials = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredMaterials.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredMaterials, currentPage]);

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
        if (selectedIds.length === paginatedMaterials.length) {
            setSelectedIds([]);
        } else {
            const selectableIds = paginatedMaterials.map(mat => mat.id);
            setSelectedIds(selectableIds);
        }
    };
    
    const confirmBulkDelete = () => {
        onDeleteMultipleMaterials(selectedIds);
        setIsBulkDeleteModalOpen(false);
        setSelectedIds([]);
        setIsSelectionMode(false);
    };

    return (
        <div className="w-full mx-auto flex flex-col space-y-8 animate-fade-in">
            {isModalOpen && (
                <MaterialModal
                    material={editingMaterial}
                    onSave={handleSaveMaterial}
                    onClose={() => setIsModalOpen(false)}
                    allProperties={allProperties}
                    isSuperAdmin={isSuperAdmin}
                />
            )}
            {isMultiModalOpen && (
                <MultiMaterialModal
                    onClose={() => setIsMultiModalOpen(false)}
                    onSave={handleAddMultiple}
                />
            )}
            {materialToDelete && (
                <ConfirmationModal
                    title="Delete Material"
                    message={`Are you sure you want to delete "${materialToDelete.name}"? This action cannot be undone.`}
                    onConfirm={confirmDelete}
                    onCancel={() => setMaterialToDelete(null)}
                />
            )}
            {isBulkDeleteModalOpen && (
                <ConfirmationModal
                    title={`Delete ${selectedIds.length} Materials`}
                    message={`Are you sure you want to delete the selected materials? This action cannot be undone.`}
                    onConfirm={confirmBulkDelete}
                    onCancel={() => setIsBulkDeleteModalOpen(false)}
                />
            )}

            <Card>
                <div className="border-b border-border pb-4 mb-6 flex justify-between items-center gap-4">
                    <h2 className="text-2xl font-bold text-primary flex-shrink-0">Material Library</h2>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        <label className="flex items-center cursor-pointer mr-4">
                            <span className="mr-3 text-sm font-medium text-text-secondary">Compare</span>
                            <div className="relative">
                                <input type="checkbox" checked={isComparisonMode} onChange={() => setIsComparisonMode(!isComparisonMode)} className="sr-only" />
                                <div className={`block w-14 h-8 rounded-full ${isComparisonMode ? 'bg-primary' : 'bg-border'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isComparisonMode ? 'translate-x-6' : ''}`}></div>
                            </div>
                        </label>
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
                
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background/50">
                            <tr>
                                {isSelectionMode && (
                                    <th scope="col" className="px-4 py-3 w-12">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary"
                                            checked={paginatedMaterials.length > 0 && selectedIds.length === paginatedMaterials.length}
                                            onChange={handleToggleSelectAll}
                                        />
                                    </th>
                                )}
                                {isComparisonMode && <th scope="col" className="px-4 py-3 w-12"><span className="sr-only">Compare</span></th>}
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        Material Grade
                                        <button ref={filterRefs.name} onClick={() => setActivePopover({ column: 'name', anchorEl: filterRefs.name.current! })}><FilterIcon isActive={!!filters.name} /></button>
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        Material Group
                                        <button ref={filterRefs.category} onClick={() => setActivePopover({ column: 'category', anchorEl: filterRefs.category.current! })}><FilterIcon isActive={!!filters.category?.length} /></button>
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                     <div className="flex items-center gap-2">
                                        Sub-Category
                                        <button ref={filterRefs.subCategory} onClick={() => setActivePopover({ column: 'subCategory', anchorEl: filterRefs.subCategory.current! })}><FilterIcon isActive={!!filters.subCategory} /></button>
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                     <div className="flex items-center gap-2">
                                        Density
                                        <button ref={filterRefs.density} onClick={() => setActivePopover({ column: 'density', anchorEl: filterRefs.density.current! })}><FilterIcon isActive={!!filters.densitySearch} /></button>
                                    </div>
                                </th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                         <tbody className="bg-surface divide-y divide-border">
                            {paginatedMaterials.map(mat => (
                                <tr
                                    key={mat.id}
                                    className={`cursor-pointer ${selectedMaterial?.id === mat.id && !isComparisonMode && !isSelectionMode ? 'bg-primary/10' : 'hover:bg-background/60'} ${selectedIds.includes(mat.id) ? '!bg-primary/20' : ''}`}
                                    onClick={() => {
                                        if (isComparisonMode) return;
                                        if (isSelectionMode) {
                                            handleToggleSelection(mat.id);
                                        } else {
                                            setSelectedMaterial(mat);
                                        }
                                    }}
                                >
                                    {isSelectionMode && (
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(mat.id)}
                                                onChange={() => handleToggleSelection(mat.id)}
                                                className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary"
                                            />
                                        </td>
                                    )}
                                    {isComparisonMode && (
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={comparingMaterials.some(m => m.id === mat.id)}
                                                onChange={() => handleToggleCompare(mat)}
                                                disabled={!comparingMaterials.some(m => m.id === mat.id) && comparingMaterials.length >= 6}
                                                className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary"
                                            />
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-semibold text-text-primary flex items-center">
                                          {mat.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{mat.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{mat.subCategory || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{renderMaterialProperty((mat.properties as any)['Density'])}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <Button variant="secondary" onClick={(e) => { e.stopPropagation(); handleEdit(mat); }}>Edit</Button>
                                        <Button variant="secondary" className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400" onClick={(e) => { e.stopPropagation(); handleDelete(mat); }}>Delete</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {totalPages > 1 && (
                    <div className="mt-4 flex justify-between items-center text-sm">
                        <Button
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            variant="secondary"
                        >
                            Previous
                        </Button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <Button
                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            variant="secondary"
                        >
                            Next
                        </Button>
                    </div>
                )}
            </Card>

            {/* Details and Chart Section */}
            {isComparisonMode ? (
                 <Card>
                    <h3 className="text-xl font-bold text-primary mb-2">Material Comparison</h3>
                    <p className="text-sm text-text-secondary mb-4">Selected {comparingMaterials.length} of 6 materials to compare.</p>
                     {comparingMaterials.length > 1 ? (
                        <MaterialComparison materials={comparingMaterials} allMaterials={materials} visibleProperties={allProperties.slice(0, 6)} />
                    ) : (
                        <div className="text-center text-text-muted p-8">
                            <p>Please select at least two materials from the list above to compare their properties.</p>
                        </div>
                    )}
                 </Card>
            ) : selectedMaterial ? (
                <Card>
                    <MaterialChart material={selectedMaterial} allMaterials={materials} />
                </Card>
            ) : (
                <Card>
                    <div className="text-center text-text-muted p-8">
                        <p>Select a material from the list to view its properties and performance chart.</p>
                    </div>
                </Card>
            )}

            {/* Filter Popovers */}
            {activePopover?.column && (
                <FilterPopover 
                    anchorEl={activePopover.anchorEl} 
                    onClose={() => setActivePopover(null)} 
                    title={`Filter by ${activePopover.column.replace(/([A-Z])/g, ' $1')}`}
                >
                    <FilterContent
                        column={activePopover.column}
                        filters={filters}
                        onApply={handleApplyFilters}
                        onClear={handleClearFilters}
                        uniqueOptions={activePopover.column === 'category' ? uniqueCategories : []}
                    />
                </FilterPopover>
            )}

        </div>
    );
};

const FilterContent: React.FC<{column: string, filters: Record<string, any>, onApply: (updates: Record<string, any>) => void, onClear: (keys: string[]) => void, uniqueOptions?: string[]}> = ({ column, filters, onApply, onClear, uniqueOptions=[] }) => {
    
    if (column === 'category') {
        const [selected, setSelected] = useState(filters.category || []);
        const handleToggle = (option: string) => {
            setSelected((prev: string[]) => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]);
        }
        return (
            <div className="space-y-2">
                <div className="max-h-48 overflow-y-auto space-y-1">
                    {uniqueOptions.map(option => (
                        <label key={option} className="flex items-center space-x-2 p-1 rounded hover:bg-background cursor-pointer">
                            <input type="checkbox" checked={selected.includes(option)} onChange={() => handleToggle(option)} className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary" />
                            <span>{option}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="secondary" className="!px-3 !py-1 text-xs" onClick={() => onClear(['category'])}>Clear</Button>
                    <Button className="!px-3 !py-1 text-xs" onClick={() => onApply({ category: selected })}>Apply</Button>
                </div>
            </div>
        )
    }

    if (column === 'density') {
        const [value, setValue] = useState(filters.densitySearch || '');
        return (
            <div className="space-y-2">
                <Input label="" placeholder="Search density..." type="text" value={value} onChange={e => setValue(e.target.value)} />
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="secondary" className="!px-3 !py-1 text-xs" onClick={() => onClear(['densitySearch'])}>Clear</Button>
                    <Button className="!px-3 !py-1 text-xs" onClick={() => onApply({ densitySearch: value })}>Apply</Button>
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
                <Button variant="secondary" className="!px-3 !py-1 text-xs" onClick={() => onClear([column])}>Clear</Button>
                <Button className="!px-3 !py-1 text-xs" onClick={() => onApply({ [column]: value })}>Apply</Button>
            </div>
        </div>
    )
}