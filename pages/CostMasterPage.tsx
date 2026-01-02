import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import type { CostMasterPageProps, MaterialMasterItem, Machine, Tool, RegionCost, RegionCurrencyMap, User } from '../types';
import { format } from 'date-fns';
import { COUNTRY_CURRENCY_MAPPING, ALL_CURRENCIES, SUPER_ADMIN_EMAILS } from '../constants';
import { DisplayField } from '../components/ui/DisplayField';
import { ConfirmationModal } from '../components/ConfirmationModal';

const ITEMS_PER_PAGE = 10;
const uuid = () => `id_${Math.random().toString(36).substring(2, 9)}`;

const currencySymbols: { [key: string]: string } = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'C$', AUD: 'A$', JPY: '¥', CNY: '¥',
};

const formatAsUSD = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

// --- Main Page Component ---
export const CostMasterPage: React.FC<CostMasterPageProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'materials' | 'machines' | 'tools' | 'regions'>('materials');
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ item: MaterialMasterItem | Machine | Tool; type: 'material' | 'machine' | 'tool' } | null>(null);

  const handleOpenPricingModal = (item: MaterialMasterItem | Machine | Tool, type: 'material' | 'machine' | 'tool') => {
    setSelectedItem({ item, type });
    setIsPricingModalOpen(true);
  };
  
  const renderContent = () => {
    switch (activeTab) {
      case 'materials': return <MaterialsCostTab {...props} onManagePricing={(item) => handleOpenPricingModal(item, 'material')} />;
      case 'machines': return <MachinesCostTab {...props} onManagePricing={(item) => handleOpenPricingModal(item, 'machine')} />;
      case 'tools': return <ToolsCostTab {...props} onManagePricing={(item) => handleOpenPricingModal(item, 'tool')} />;
      case 'regions': return <RegionCurrencyTab {...props} />;
      default: return null;
    }
  };

  const TabButton: React.FC<{ label: string; tabKey: typeof activeTab; }> = ({ label, tabKey }) => (
    <button
      onClick={() => setActiveTab(tabKey)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeTab === tabKey
          ? 'bg-primary text-white'
          : 'text-text-secondary hover:bg-surface'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full mx-auto space-y-8 animate-fade-in">
        {isPricingModalOpen && selectedItem && (
            <RegionPricingModal
                item={selectedItem.item}
                itemType={selectedItem.type}
                onClose={() => setIsPricingModalOpen(false)}
                regionCosts={props.regionCosts}
                regionCurrencyMap={props.regionCurrencyMap}
                onAddRegionCost={props.onAddRegionCost}
                onUpdateRegionCost={props.onUpdateRegionCost}
                onDeleteRegionCost={props.onDeleteRegionCost}
            />
        )}
        <Card>
            <div className="border-b border-border pb-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-primary">Cost Master</h2>
                </div>
                <div className="flex items-center space-x-2 border-b border-border" role="tablist">
                    <TabButton label="Materials" tabKey="materials" />
                    <TabButton label="Machines" tabKey="machines" />
                    <TabButton label="Tools" tabKey="tools" />
                    <TabButton label="Regions & Currencies" tabKey="regions" />
                </div>
            </div>
            <div>
                {renderContent()}
            </div>
        </Card>
    </div>
  );
};

// --- Region Currency Tab ---
const RegionCurrencyTab: React.FC<Pick<CostMasterPageProps, 'regionCurrencyMap' | 'onAddRegionCurrency' | 'onDeleteRegionCurrency' | 'user'>> = ({
    regionCurrencyMap, onAddRegionCurrency, onDeleteRegionCurrency, user
}) => {
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email);
    const [newRegion, setNewRegion] = useState('');
    const [newCurrency, setNewCurrency] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [mapToDelete, setMapToDelete] = useState<RegionCurrencyMap | null>(null);

    useEffect(() => {
        const regionMatch = COUNTRY_CURRENCY_MAPPING.find(
            ccm => ccm.country.toLowerCase() === newRegion.toLowerCase().trim()
        );
        if (regionMatch) {
            setNewCurrency(regionMatch.currency);
        }
    }, [newRegion]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const trimmedRegion = newRegion.trim();
        if (!trimmedRegion) {
            setError('Please enter a region name.');
            return;
        }
        if (!newCurrency) {
            setError('Please select a currency.');
            return;
        }

        const existingCustomMapping = regionCurrencyMap.find(
            rcm => rcm.user_id === user.id && rcm.region.toLowerCase() === trimmedRegion.toLowerCase()
        );

        if (existingCustomMapping) {
            setError(`You have already added "${trimmedRegion}" as a custom region.`);
            return;
        }

        setIsSaving(true);
        try {
            await onAddRegionCurrency({ region: trimmedRegion, currency: newCurrency });
            setNewRegion('');
            setNewCurrency('');
        } catch (err: any) {
             setError(err.message || 'An unexpected error occurred while adding the region.');
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDeleteMapping = () => {
        if (mapToDelete) {
            onDeleteRegionCurrency(mapToDelete.id);
            setMapToDelete(null);
        }
    };

    return (
        <div>
            {mapToDelete && (
                <ConfirmationModal
                    title="Delete Region Mapping"
                    message={`Are you sure you want to delete the mapping for "${mapToDelete.region}"? This action cannot be undone.`}
                    onConfirm={confirmDeleteMapping}
                    onCancel={() => setMapToDelete(null)}
                />
            )}
            <h3 className="text-lg font-semibold text-text-primary mb-4">Manage Region & Currency Mappings</h3>
            
            <Card className="mb-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h4 className="text-md font-semibold text-text-secondary">Add New Mapping</h4>
                    <p className="text-sm text-text-muted">Enter a custom region name. If it's a known country, the currency will be suggested automatically. You can create a custom mapping for a default region (like India) to override its currency for your account.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <Input
                            label="Region Name"
                            value={newRegion}
                            onChange={e => setNewRegion(e.target.value)}
                            placeholder="e.g., US East, Europe - High Cost"
                            required
                        />
                        <Select
                            label="Currency"
                            value={newCurrency}
                            onChange={e => setNewCurrency(e.target.value)}
                            required
                        >
                            <option value="">Select Currency...</option>
                            {ALL_CURRENCIES.map(curr => (
                                <option key={curr} value={curr}>{curr}</option>
                            ))}
                        </Select>
                        <Button type="submit" disabled={isSaving || !newRegion || !newCurrency}>
                            {isSaving ? 'Adding...' : 'Add Mapping'}
                        </Button>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </form>
            </Card>

            <div>
                 <h3 className="text-lg font-semibold text-text-primary mb-2">Active Mappings</h3>
                <div className="border border-border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Region</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Currency</th>
                                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                         <tbody className="bg-surface divide-y divide-border">
                            {[...regionCurrencyMap].sort((a,b) => a.region.localeCompare(b.region)).map(rcm => {
                                const isCustom = !!rcm.user_id;
                                const isOwner = isCustom && rcm.user_id === user.id;
                                // A mapping can be deleted if it is a custom mapping...
                                // ...and the current user is either the owner or a super admin.
                                // This prevents deletion of global default mappings.
                                const canDelete = isCustom && (isOwner || isSuperAdmin);
                                return (
                                <tr key={rcm.id}>
                                    <td className="px-6 py-4 font-semibold text-text-primary">
                                        <div className="flex items-center gap-3">
                                            <span>{rcm.region}</span>
                                            {isCustom ? (
                                                <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Custom</span>
                                            ) : (
                                                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Default</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-text-secondary">{rcm.currency}</td>
                                    <td className="px-6 py-4 text-right">
                                        {canDelete ? (
                                            <Button variant="secondary" className="text-red-500 !px-3 !py-1 text-xs" onClick={() => setMapToDelete(rcm)}>Delete</Button>
                                        ) : null}
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


// --- Helper Components for other Tabs ---

const MaterialsCostTab: React.FC<Pick<CostMasterPageProps, 'materials'> & { onManagePricing: (item: MaterialMasterItem) => void; }> = ({ materials, onManagePricing }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredMaterials = useMemo(() =>
    materials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [materials, searchTerm]
  );

  const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);
  const paginatedMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMaterials.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMaterials, currentPage]);

  return (
    <div>
      <Input placeholder="Search materials..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="mb-4 max-w-sm" label="" />
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Material Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Default Cost / Kg (USD)</th>
              <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {paginatedMaterials.map(mat => {
              const costProp = (mat.properties as any)['Cost Per Kg'];
              const cost = costProp ? Number(costProp.value) : null;
              return (
                <tr key={mat.id} className="hover:bg-background/60">
                    <td className="px-6 py-4 font-medium text-text-primary">{mat.name}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{mat.category}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{formatAsUSD(cost)}</td>
                    <td className="px-6 py-4 text-right">
                        <Button onClick={() => onManagePricing(mat)} className="!px-4 !py-1.5">Manage Pricing</Button>
                    </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationControls currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
    </div>
  );
};

const MachinesCostTab: React.FC<Pick<CostMasterPageProps, 'machines'> & { onManagePricing: (item: Machine) => void; }> = ({ machines, onManagePricing }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const filteredMachines = useMemo(() =>
        machines.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [machines, searchTerm]
    );

    const totalPages = Math.ceil(filteredMachines.length / ITEMS_PER_PAGE);
    const paginatedMachines = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredMachines.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredMachines, currentPage]);

    return (
        <div>
            <Input placeholder="Search machines..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="mb-4 max-w-sm" label="" />
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Machine Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Default Rate ($/hr)</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                        {paginatedMachines.map(mach => (
                             <tr key={mach.id} className="hover:bg-background/60">
                                <td className="px-6 py-4 font-medium text-text-primary">{mach.name}</td>
                                <td className="px-6 py-4 text-sm text-text-secondary">{mach.machineType}</td>
                                <td className="px-6 py-4 text-sm text-text-secondary">{formatAsUSD(mach.hourlyRate)}</td>
                                <td className="px-6 py-4 text-right">
                                    <Button onClick={() => onManagePricing(mach)} className="!px-4 !py-1.5">Manage Pricing</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PaginationControls currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
        </div>
    );
};

const ToolsCostTab: React.FC<Pick<CostMasterPageProps, 'tools'> & { onManagePricing: (item: Tool) => void; }> = ({ tools, onManagePricing }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const filteredTools = useMemo(() =>
        tools.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [tools, searchTerm]
    );

    const totalPages = Math.ceil(filteredTools.length / ITEMS_PER_PAGE);
    const paginatedTools = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTools.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredTools, currentPage]);

    return (
        <div>
            <Input placeholder="Search tools..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="mb-4 max-w-sm" label="" />
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Tool Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Default Price (USD)</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                        {paginatedTools.map(tool => (
                             <tr key={tool.id} className="hover:bg-background/60">
                                <td className="px-6 py-4 font-medium text-text-primary">{tool.name}</td>
                                <td className="px-6 py-4 text-sm text-text-secondary">{tool.toolType}</td>
                                <td className="px-6 py-4 text-sm text-text-secondary">{formatAsUSD(tool.price)}</td>
                                <td className="px-6 py-4 text-right">
                                    <Button onClick={() => onManagePricing(tool)} className="!px-4 !py-1.5">Manage Pricing</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PaginationControls currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
        </div>
    );
};


// --- Regional Pricing Modal and its Children ---
interface RegionPricingModalProps {
    item: MaterialMasterItem | Machine | Tool;
    itemType: 'material' | 'machine' | 'tool';
    onClose: () => void;
    regionCosts: RegionCost[];
    regionCurrencyMap: RegionCurrencyMap[];
    onAddRegionCost: (cost: Omit<RegionCost, 'id' | 'created_at' | 'user_id'>) => void;
    onUpdateRegionCost: (cost: Pick<RegionCost, 'id' | 'price' | 'valid_from'>) => void;
    onDeleteRegionCost: (costId: string) => void;
}

const RegionPricingModal: React.FC<RegionPricingModalProps> = ({ item, itemType, regionCosts, regionCurrencyMap, onAddRegionCost, onUpdateRegionCost, onDeleteRegionCost, onClose }) => {
    const [newRegion, setNewRegion] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newValidFrom, setNewValidFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isSaving, setIsSaving] = useState(false);
    const [historyModal, setHistoryModal] = useState<{ isOpen: boolean, region: string }>({ isOpen: false, region: '' });
    const [editingCost, setEditingCost] = useState<RegionCost | null>(null);

    const itemRegionCosts = useMemo(() => 
        regionCosts.filter(rc => rc.item_id === item.id && rc.item_type === itemType),
    [regionCosts, item.id, itemType]);
    
    const determinedCurrency = useMemo(() => {
        if (!newRegion) return null;
        const mapping = regionCurrencyMap.find(rcm => rcm.region === newRegion);
        return mapping?.currency;
    }, [newRegion, regionCurrencyMap]);
    
    const availableRegions = useMemo(() => {
        return [...new Set(regionCurrencyMap.map(rcm => rcm.region))].sort();
    }, [regionCurrencyMap]);

    const regionsWithPrices = useMemo(() => {
        const uniqueRegions = [...new Set(itemRegionCosts.map(rc => rc.region))].sort();
        return uniqueRegions.map(region => {
            const latestPrice = itemRegionCosts
                .filter(rc => rc.region === region)
                .sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime())[0];
            return latestPrice;
        }).filter(Boolean) as RegionCost[];
    }, [itemRegionCosts]);

    const handleEdit = (cost: RegionCost) => {
        setEditingCost(cost);
        setNewRegion(cost.region);
        setNewPrice(String(cost.price));
        setNewValidFrom(format(new Date(cost.valid_from), 'yyyy-MM-dd'));
        setHistoryModal({ isOpen: false, region: '' }); // Close history if editing from there
    };

    const resetForm = () => {
        setNewRegion('');
        setNewPrice('');
        setNewValidFrom(format(new Date(), 'yyyy-MM-dd'));
        setEditingCost(null);
        setIsSaving(false);
    };
    
    const handleSave = async () => {
        if (!newRegion.trim() || !newPrice.trim()) return;
        setIsSaving(true);
        if (editingCost) {
            await onUpdateRegionCost({
                id: editingCost.id,
                price: parseFloat(newPrice),
                valid_from: newValidFrom,
            });
        } else {
            const currency = determinedCurrency;
            if (!currency) {
                alert(`No currency is defined for the region '${newRegion}'. Please define it in the 'Regions & Currencies' tab first.`);
                setIsSaving(false);
                return;
            }
            await onAddRegionCost({
                item_id: item.id,
                item_type: itemType,
                region: newRegion.trim(),
                price: parseFloat(newPrice),
                currency: currency,
                valid_from: newValidFrom
            });
        }
        resetForm();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
            {historyModal.isOpen && (
                <PriceHistoryModal 
                    region={historyModal.region} 
                    costs={itemRegionCosts.filter(rc => rc.region === historyModal.region)} 
                    onClose={() => setHistoryModal({isOpen: false, region: ''})}
                    onEdit={handleEdit}
                    onDelete={onDeleteRegionCost}
                />
            )}
            <Card className="max-w-3xl w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">&times;</button>
                <h2 className="text-2xl font-bold text-primary mb-2">Regional Pricing</h2>
                <p className="text-text-secondary mb-6">{item.name}</p>
                
                <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-6">
                    {/* Current Prices */}
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">Current Prices</h3>
                        {regionsWithPrices.length > 0 ? (
                            <div className="border border-border rounded-md">
                                {regionsWithPrices.map((rc, index) => (
                                    <div key={rc.id} className={`flex justify-between items-center p-3 ${index > 0 ? 'border-t border-border' : ''}`}>
                                        <div className="font-semibold text-text-primary flex items-center gap-2">
                                            {rc.region}
                                            {rc.region === 'United States' && (
                                                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Default</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-text-primary">{currencySymbols[rc.currency] || rc.currency}{rc.price.toFixed(2)}</span>
                                            <span className="text-sm text-text-muted">(from {format(new Date(rc.valid_from), 'PP')})</span>
                                            <Button variant="secondary" className="!px-3 !py-1 text-xs" onClick={() => handleEdit(rc)}>Edit</Button>
                                            <Button variant="secondary" className="!px-3 !py-1 text-xs" onClick={() => setHistoryModal({isOpen: true, region: rc.region})}>History</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-text-muted text-center py-4">No regional prices set for this item yet.</p>}
                    </div>

                    {/* Add New Price Form */}
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-4 pt-4 border-t border-border">{editingCost ? 'Update Price' : 'Add New Price'}</h3>
                        <div className="space-y-4 bg-background/50 p-4 rounded-lg">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                                <div className="sm:col-span-1">
                                    <Select label="Region" value={newRegion} onChange={e => setNewRegion(e.target.value)} disabled={!!editingCost}>
                                        <option value="">Select Region...</option>
                                        {availableRegions.map(r => <option key={r} value={r}>{r}</option>)}
                                    </Select>
                                </div>
                                <Input label="New Price" type="number" step="any" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
                                <div className="sm:col-span-1">
                                    <DisplayField label="Currency" value={(editingCost ? editingCost.currency : determinedCurrency) || 'N/A'} />
                                </div>
                                <Input label="Valid From" type="date" value={newValidFrom} onChange={e => setNewValidFrom(e.target.value)} />
                            </div>
                            <div className="flex justify-end gap-2">
                                {editingCost && <Button variant="secondary" onClick={resetForm}>Cancel Edit</Button>}
                                <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : (editingCost ? 'Update Price' : 'Save Price')}</Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-border">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </Card>
        </div>
    );
};

interface PriceHistoryModalProps {
    region: string;
    costs: RegionCost[];
    onClose: () => void;
    onEdit: (cost: RegionCost) => void;
    onDelete: (costId: string) => void;
}

const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({ region, costs, onClose, onEdit, onDelete }) => {
    const [costToDelete, setCostToDelete] = useState<RegionCost | null>(null);
    const sortedCosts = useMemo(() => costs.sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()), [costs]);
    
    const confirmDelete = () => {
        if (costToDelete) {
            onDelete(costToDelete.id);
            setCostToDelete(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4">
             {costToDelete && (
                <ConfirmationModal 
                    title="Delete Price Entry"
                    message={`Are you sure you want to delete the price entry from ${format(new Date(costToDelete.valid_from), 'PP')}? This action is permanent.`}
                    onConfirm={confirmDelete}
                    onCancel={() => setCostToDelete(null)}
                />
            )}
             <Card className="max-w-lg w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">&times;</button>
                <h3 className="text-xl font-bold text-primary mb-4">Price History for {region}</h3>
                <div className="max-h-80 overflow-y-auto">
                    <ul className="divide-y divide-border">
                        {sortedCosts.map(cost => (
                            <li key={cost.id} className="py-2 flex justify-between items-center">
                                <div>
                                    <span className="text-text-secondary">Effective {format(new Date(cost.valid_from), 'PP')}</span>
                                    <span className="font-semibold text-text-primary ml-4">{currencySymbols[cost.currency] || cost.currency}{cost.price.toFixed(2)}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => onEdit(cost)}>Edit</Button>
                                    <Button variant="secondary" className="!px-2 !py-1 text-xs text-red-500" onClick={() => setCostToDelete(cost)}>Delete</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex justify-end mt-4 pt-4 border-t border-border">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
             </Card>
        </div>
    );
};


// --- Pagination Component ---
const PaginationControls: React.FC<{ currentPage: number, totalPages: number, setCurrentPage: (page: number) => void }> = ({ currentPage, totalPages, setCurrentPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex justify-between items-center text-sm">
      <Button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} variant="secondary">Previous</Button>
      <span>Page {currentPage} of {totalPages}</span>
      <Button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} variant="secondary">Next</Button>
    </div>
  );
};
