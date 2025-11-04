import React, { useState, useEffect } from 'react';
import type { SettingsPageProps, User } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onUpdateUser }) => {
    const [formData, setFormData] = useState<User>(user);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setFormData(user);
    }, [user]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'number' ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateUser(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
            <form onSubmit={handleSubmit}>
                <Card>
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">User Profile</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Full Name" name="name" value={formData.name} onChange={handleInputChange} />
                        <Input label="Email Address" name="email" value={formData.email} onChange={handleInputChange} disabled />
                    </div>
                </Card>

                <Card className="mt-8">
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Company Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Company Name" name="companyName" value={formData.companyName || ''} onChange={handleInputChange} />
                        <Input label="Phone Number" name="phone" value={formData.phone || ''} onChange={handleInputChange} />
                        <div className="md:col-span-2">
                          <Input label="Address" name="address" value={formData.address || ''} onChange={handleInputChange} />
                        </div>
                    </div>
                </Card>

                 <Card className="mt-8">
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Application Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         <Select label="Currency" name="currency" value={formData.currency || 'USD'} onChange={handleInputChange}>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="INR">INR (₹)</option>
                         </Select>
                         <Input label="Calculation Number Prefix" name="calcPrefix" value={formData.calcPrefix || ''} onChange={handleInputChange} />
                         <Input label="Next Calculation Number" name="calcNextNumber" type="number" value={formData.calcNextNumber || 1} onChange={handleInputChange} />
                    </div>
                </Card>

                <div className="flex justify-end items-center space-x-4 mt-8">
                    {saved && <span className="text-green-400 animate-fade-in">Settings Saved!</span>}
                    <Button type="submit">Save Settings</Button>
                </div>
            </form>
        </div>
    );
};