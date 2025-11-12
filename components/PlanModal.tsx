import React, { useState, useEffect } from 'react';
import type { SubscriptionPlan, PriceInfo } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

interface PlanModalProps {
  plan: SubscriptionPlan | null;
  onSave: (plan: SubscriptionPlan) => void;
  onClose: () => void;
}

// Define a specific type for the form's state to handle the 'unlimited' string case.
type PlanFormState = {
  name: string;
  prices: { [currency: string]: PriceInfo };
  period: "mo" | "yr" | "";
  is_custom_price: boolean;
  calculation_limit: string | number;
  features: string;
  cta: string;
  most_popular: boolean;
  created_at: string;
};


const BLANK_PLAN_FORM: PlanFormState = {
  name: '',
  prices: { USD: { price: 0 }, EUR: { price: 0 }, INR: { price: 0 } },
  period: 'mo',
  is_custom_price: false,
  calculation_limit: 0,
  features: '',
  cta: 'Choose Plan',
  most_popular: false,
  created_at: '',
};

const CURRENCIES = ['USD', 'EUR', 'INR'];

export const PlanModal: React.FC<PlanModalProps> = ({ plan, onSave, onClose }) => {
  const [formData, setFormData] = useState<PlanFormState>(BLANK_PLAN_FORM);

  useEffect(() => {
     if (plan) {
        const initialPrices: { [key: string]: PriceInfo } = {};
        CURRENCIES.forEach(c => {
            initialPrices[c] = {
                price: (plan.prices as any)?.[c]?.price || 0,
                displayPrice: (plan.prices as any)?.[c]?.displayPrice,
            };
        });
        
        setFormData({
          name: plan.name,
          period: plan.period,
          is_custom_price: plan.is_custom_price,
          cta: plan.cta,
          most_popular: plan.most_popular,
          created_at: plan.created_at,
          features: plan.features.join('\n'),
          calculation_limit: plan.calculation_limit === -1 ? 'unlimited' : plan.calculation_limit,
          prices: initialPrices
        });
     } else {
        setFormData(BLANK_PLAN_FORM);
     }
  }, [plan]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value 
    }));
  };
  
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const [currency, field] = name.split('-'); // e.g., "USD-price"
    
    setFormData(prev => ({
      ...prev,
      prices: {
        ...prev.prices,
        [currency]: {
            ...prev.prices[currency],
            [field]: value ? (parseFloat(value) || 0) : undefined
        }
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const calcLimit = String(formData.calculation_limit) === 'unlimited'
        ? -1
        : (parseInt(String(formData.calculation_limit), 10) || 0);
    
    const planToSave: SubscriptionPlan = {
        id: plan?.id || new Date().toISOString() + Math.random(),
        name: formData.name,
        prices: formData.is_custom_price ? null : formData.prices,
        period: formData.period,
        is_custom_price: formData.is_custom_price,
        calculation_limit: calcLimit,
        features: formData.features.split('\n').filter((f: string) => f.trim() !== ''),
        cta: formData.cta,
        most_popular: formData.most_popular,
        created_at: plan?.created_at || new Date().toISOString(),
    };
    onSave(planToSave);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="max-w-xl w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
        <h2 className="text-2xl font-bold text-primary mb-6">{plan ? 'Edit Plan' : 'Add New Plan'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
          <Input label="Plan Name" name="name" value={formData.name} onChange={handleInputChange} required />

          <div className="flex items-center">
            <input id="is_custom_price" name="is_custom_price" type="checkbox" checked={formData.is_custom_price} onChange={handleInputChange} className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary" />
            <label htmlFor="is_custom_price" className="ml-2 block text-sm text-text-primary">Mark as "Contact Us" (custom price)</label>
          </div>
          
          <div className="space-y-3">
            {CURRENCIES.map(currency => (
                 <div key={currency} className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2 border border-border rounded-md">
                    <Input 
                        label={`Price (${currency})`} 
                        name={`${currency}-price`}
                        type="number" 
                        step="any"
                        value={formData.prices[currency]?.price || ''} 
                        onChange={handlePriceChange} 
                        unit={currency}
                        disabled={formData.is_custom_price} 
                    />
                    <Input 
                        label={`Display Price (${currency})`}
                        name={`${currency}-displayPrice`}
                        type="number" 
                        step="any"
                        value={formData.prices[currency]?.displayPrice || ''} 
                        onChange={handlePriceChange} 
                        unit={currency}
                        disabled={formData.is_custom_price} 
                        placeholder="Optional"
                    />
                </div>
            ))}
          </div>
          
           <Select label="Period" name="period" value={formData.period} onChange={handleInputChange}>
              <option value="mo">Monthly</option>
              <option value="yr">Yearly</option>
              <option value="">N/A</option>
            </Select>

          <Input 
            label="Calculation Limit" 
            name="calculation_limit" 
            value={String(formData.calculation_limit)} 
            onChange={handleInputChange} 
            required 
            placeholder="e.g., 100 or 'unlimited'" 
          />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Features (one per line)</label>
            <textarea
              name="features"
              value={formData.features}
              onChange={handleInputChange}
              rows={4}
              className="block w-full px-3 py-2 border rounded-md focus:outline-none sm:text-sm bg-background/50 text-text-input border-border placeholder-text-muted focus:ring-primary focus:border-primary"
            />
          </div>
          <Input label="CTA Button Text" name="cta" value={formData.cta} onChange={handleInputChange} required />
           <div className="flex items-center">
                <input
                    id="most_popular"
                    name="most_popular"
                    type="checkbox"
                    checked={formData.most_popular}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary"
                />
                <label htmlFor="most_popular" className="ml-2 block text-sm text-text-primary">
                    Mark as Most Popular
                </label>
            </div>
          <div className="flex justify-end space-x-4 mt-6 border-t border-border pt-4">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Plan</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};