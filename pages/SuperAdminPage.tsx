



import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PlanModal } from '../components/PlanModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import type { SubscriptionPlan, SuperAdminPageProps, PriceInfo } from '../types';

export const SuperAdminPage: React.FC<SuperAdminPageProps> = ({ plans, onAddPlan, onUpdatePlan, onDeletePlan }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);

  const handleAddNew = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleDelete = (plan: SubscriptionPlan) => {
    setPlanToDelete(plan);
  };

  const confirmDelete = () => {
    if (planToDelete) {
      onDeletePlan(planToDelete.id);
      setPlanToDelete(null);
    }
  };

  const handleSavePlan = (plan: SubscriptionPlan) => {
    if (editingPlan) {
      onUpdatePlan(plan);
    } else {
      onAddPlan(plan);
    }
    setIsModalOpen(false);
  };
  
  const renderPrice = (priceInfo: PriceInfo | undefined, currency: string) => {
    if (!priceInfo) return 'N/A';
    
    const format = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);
    
    if (priceInfo.displayPrice && priceInfo.displayPrice > priceInfo.price) {
        return (
            <span>
                {format(priceInfo.price)}
                <span className="ml-2 text-sm text-text-muted line-through">{format(priceInfo.displayPrice)}</span>
            </span>
        )
    }
    return format(priceInfo.price);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in">
      {isModalOpen && (
        <PlanModal 
          plan={editingPlan} 
          onSave={handleSavePlan} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
      {planToDelete && (
        <ConfirmationModal
          title="Delete Plan"
          message={`Are you sure you want to delete the "${planToDelete.name}" plan? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setPlanToDelete(null)}
        />
      )}
      
      <Card>
        <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-primary">Subscription Plans</h2>
          <Button onClick={handleAddNew}>+ Add New Plan</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Plan Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Price (USD)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Price (EUR)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Price (INR)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Calculation Limit</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-background/60">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-primary">
                    {plan.name} {plan.most_popular && <span className="ml-2 text-xs font-semibold rounded-full bg-primary/20 text-primary/80 px-2 py-1">Popular</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {plan.is_custom_price ? 'Contact Us' : renderPrice((plan.prices as any)?.USD, 'USD')}
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {plan.is_custom_price ? 'Contact Us' : renderPrice((plan.prices as any)?.EUR, 'EUR')}
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {plan.is_custom_price ? 'Contact Us' : renderPrice((plan.prices as any)?.INR, 'INR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary capitalize">{plan.calculation_limit === -1 ? 'Unlimited' : plan.calculation_limit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Button variant="secondary" onClick={() => handleEdit(plan)}>Edit</Button>
                    <Button variant="secondary" onClick={() => handleDelete(plan)} className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400">Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};