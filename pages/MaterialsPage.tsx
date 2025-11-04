import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MaterialChart } from '../components/MaterialChart';
import { MaterialComparison } from '../components/MaterialComparison';
import type { MaterialMasterItem, MaterialProperty, User } from '../types';
import { MaterialModal } from '../components/MaterialModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { MultiMaterialModal } from '../components/MultiMaterialModal';
import { DEFAULT_MATERIAL_IDS, SUPER_ADMIN_EMAILS } from '../constants';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

const ITEMS_PER_PAGE = 10;

interface MaterialsPageProps {
  materials: MaterialMasterItem[];
  user: User;
  onAddMaterial: (material: MaterialMasterItem) => void;
  onUpdateMaterial: (material: MaterialMasterItem) => void;
  onDeleteMaterial: (materialId: string) => void;
  onAddMultipleMaterials: (materials: Omit<MaterialMasterItem, 'id' | 'user_id' | 'created_at'>[]) => void;
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


export const MaterialsPage: React.FC<MaterialsPageProps> = ({ materials, user, onAddMaterial, onUpdateMaterial, onDeleteMaterial, onAddMultipleMaterials }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<MaterialMasterItem | null>(null);
    const [materialToDelete, setMaterialToDelete] = useState<MaterialMasterItem | null>(null);
    const [selectedMaterial, setSelectedMaterial] = useState<MaterialMasterItem | null>(materials[0] || null);
    
    // Comparison state
    const [comparingMaterials, setComparingMaterials] = useState<MaterialMasterItem[]>([]);
    const [isComparisonMode, setIsComparisonMode] = useState(false);

    // Filters and pagination state
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [subCategoryFilter, setSubCategoryFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    
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
    
    const availableSubCategories = useMemo(() => {
        const relevantMaterials = categoryFilter === 'All' 
            ? materials 
            : materials.filter(m => m.category === categoryFilter);

        const subCats = new Set<string>();
        relevantMaterials.forEach(m => {
            if (m.subCategory) {
                subCats.add(m.subCategory);
            }
        });
        return Array.from(subCats).sort();
    }, [materials, categoryFilter]);

    const filteredMaterials = useMemo(() => {
        return materials.filter(material => {
            const lowercasedTerm = searchTerm.toLowerCase();
            const searchMatch = searchTerm === '' ||
                material.name.toLowerCase().includes(lowercasedTerm);

            const categoryMatch = categoryFilter === 'All' || material.category === categoryFilter;
            const subCategoryMatch = subCategoryFilter === 'All' || material.subCategory === subCategoryFilter;

            return searchMatch && categoryMatch && subCategoryMatch;
        });
    }, [materials, searchTerm, categoryFilter, subCategoryFilter]);

    const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
        setter(value);
        setCurrentPage(1);
    };

    const handleCategoryFilterChange = (value: string) => {
        setCategoryFilter(value);
        setSubCategoryFilter('All');
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);
    const paginatedMaterials = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredMaterials.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredMaterials, currentPage]);

    const materialCategories = useMemo(() => Array.from(new Set(materials.map(m => m.category))).sort(), [materials]);

    return (
        <div className="w-full mx-auto flex flex-col space-y-8 animate-fade-in">
            {isModalOpen && (
                <MaterialModal
                    material={editingMaterial}
                    onSave={handleSaveMaterial}
                    onClose={() => setIsModalOpen(false)}
                    allProperties={allProperties}
                    currency={user.currency || 'USD'}
                />
            )}
            {isMultiModalOpen && (
                <MultiMaterialModal
                    onClose={() => setIsMultiModalOpen(false)}
                    onSave={handleAddMultiple}
                    currency={user.currency || 'USD'}
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

            <Card>
                <div className="flex justify-between items-start mb-6 border-b border-border pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">Material Library</h2>
                        <p className="text-sm text-text-secondary mt-1">Browse, compare, and manage your material data.</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Button onClick={handleAddNew}>+ Add New Material</Button>
                        <Button onClick={() => setIsMultiModalOpen(true)}>+ Add Multiple with AI</Button>
                    </div>
                </div>

                {/* Filters and List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <Input 
                        label="Search material"
                        placeholder="e.g., Aluminum 6061-T6"
                        value={searchTerm}
                        onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
                    />
                    <Select
                        label="Material Group"
                        value={categoryFilter}
                        onChange={(e) => handleCategoryFilterChange(e.target.value)}
                    >
                        <option value="All">All Groups</option>
                        {materialCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </Select>
                     <Select
                        label="Search for a Sub Group"
                        value={subCategoryFilter}
                        onChange={(e) => handleFilterChange(setSubCategoryFilter, e.target.value)}
                    >
                        <option value="All">All Sub Groups</option>
                        {availableSubCategories.map(subCat => <option key={subCat} value={subCat}>{subCat}</option>)}
                    </Select>
                     <div className="flex items-end justify-end">
                        <label className="flex items-center cursor-pointer">
                            <span className="mr-3 text-sm font-medium text-text-secondary">Compare Materials</span>
                            <div className="relative">
                                <input type="checkbox" checked={isComparisonMode} onChange={() => setIsComparisonMode(!isComparisonMode)} className="sr-only" />
                                <div className={`block w-14 h-8 rounded-full ${isComparisonMode ? 'bg-primary' : 'bg-border'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isComparisonMode ? 'translate-x-6' : ''}`}></div>
                            </div>
                        </label>
                    </div>
                </div>
                
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background/50">
                            <tr>
                                {isComparisonMode && <th scope="col" className="px-4 py-3 w-12"><span className="sr-only">Compare</span></th>}
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Material Grade</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Material Group</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Sub-Category</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Density</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cost / Kg</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                         <tbody className="bg-surface divide-y divide-border">
                            {paginatedMaterials.map(mat => {
                                const isDefault = DEFAULT_MATERIAL_IDS.has(mat.id);
                                const canModify = !isDefault || isSuperAdmin;
                                return (
                                <tr
                                    key={mat.id}
                                    className={`cursor-pointer ${selectedMaterial?.id === mat.id && !isComparisonMode ? 'bg-primary/10' : 'hover:bg-background/60'}`}
                                    onClick={() => !isComparisonMode && setSelectedMaterial(mat)}
                                >
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
                                          {isDefault && <span className="ml-2 text-xs font-semibold rounded-full bg-surface text-text-secondary border border-border px-2 py-0.5">Default</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{mat.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{mat.subCategory || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{renderMaterialProperty((mat.properties as any)['Density'])}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{renderMaterialProperty((mat.properties as any)['Cost Per Kg'])}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <Button variant="secondary" onClick={(e) => { e.stopPropagation(); handleEdit(mat); }} disabled={!canModify} title={!canModify ? "Default items cannot be modified" : ""}>Edit</Button>
                                        <Button variant="secondary" className={canModify ? "text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400" : ""} onClick={(e) => { e.stopPropagation(); handleDelete(mat); }} disabled={!canModify} title={!canModify ? "Default items cannot be modified" : ""}>Delete</Button>
                                    </td>
                                </tr>
                            )})}
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
        </div>
    );
};
