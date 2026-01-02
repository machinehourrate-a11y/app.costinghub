
import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { SubscriptionPlan } from '../types';

interface PlanModalProps {
  plan: SubscriptionPlan | null;
  onSave: (plan: SubscriptionPlan) => void;
  onClose: () => void;
}

export const PlanModal: React.FC<PlanModalProps> = ({ plan, onSave, onClose }) => {
    const [name, setName] = useState(plan?.name || '');
    const [calculationLimit, setCalculationLimit] = useState(plan?.calculation_limit || 0);

    useEffect(() => {
        if (plan) {
            setName(plan.name);
            setCalculationLimit(plan.calculation_limit);
        }
    }, [plan]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...plan,
            id: plan?.id || crypto.randomUUID(),
            name,
            calculation_limit: calculationLimit,
            prices: plan?.prices || {},
            period: plan?.period || 'mo',
            is_custom_price: plan?.is_custom_price || false,
            features: plan?.features || [],
            cta: plan?.cta || 'Subscribe',
            most_popular: plan?.most_popular || false,
        } as SubscriptionPlan);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full relative">
                <h2 className="text-xl font-bold text-primary mb-4">{plan ? 'Edit Plan' : 'Add Plan'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Plan Name" value={name} onChange={e => setName(e.target.value)} required />
                    <Input label="Calculation Limit (-1 for unlimited)" type="number" value={calculationLimit} onChange={e => setCalculationLimit(parseInt(e.target.value))} required />
                    <div className="flex justify-end space-x-4 pt-4 border-t border-border">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Plan</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
