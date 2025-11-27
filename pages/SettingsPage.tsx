import React, { useState, useEffect } from 'react';
import type { SettingsPageProps, User } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { COUNTRIES } from '../constants';
import { supabase } from '../services/supabaseClient';

const getExpiryStatus = (expiryDateString: string | null) => {
    if (!expiryDateString) {
        return { text: '', className: 'text-text-secondary' };
    }
    const expiryDate = new Date(expiryDateString);
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    let className = 'text-text-primary';
    if (expiryDate < now) {
        className = 'text-red-500 font-semibold';
    } else if (expiryDate < sevenDaysFromNow) {
        className = 'text-yellow-500 font-semibold';
    }
    
    return {
        text: `Expires on ${expiryDate.toLocaleDateString()}`,
        className: className
    };
};

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onUpdateUser, plans, onNavigate, isSuperAdmin }) => {
    const [formData, setFormData] = useState<User>(user);
    const [saved, setSaved] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isRemovingLogo, setIsRemovingLogo] = useState(false);
    const [uploadError, setUploadError] = useState('');

    useEffect(() => {
        setFormData(user);
    }, [user]);

    const currentPlan = plans.find(p => p.id === user.plan_id) || plans.find(p => p.name === 'Free');
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: any = value;
        
        if (type === 'number') {
            finalValue = parseFloat(value) || 0;
        }
        
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };
    
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        
        setIsUploading(true);
        setUploadError('');
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error } = await supabase.storage.from('company_logos').upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
        });

        if (error) {
            setUploadError(`Failed to upload logo: ${error.message}`);
        } else {
            const { data } = supabase.storage.from('company_logos').getPublicUrl(filePath);
            if (data?.publicUrl) {
                // Add a timestamp to bust the cache
                const urlWithCacheBuster = `${data.publicUrl}?t=${new Date().getTime()}`;
                setFormData(prev => ({...prev, company_logo_url: urlWithCacheBuster}));
            }
        }
        setIsUploading(false);
    };

    const handleRemoveLogo = async () => {
        if (!formData.company_logo_url || !user) return;

        setIsRemovingLogo(true);
        setUploadError('');

        try {
            // Extract file path from the full URL
            // e.g., https://.../public/company_logos/user-id/filename.png?t=...
            const urlParts = formData.company_logo_url.split('/company_logos/');
            if (urlParts.length > 1) {
                const filePath = urlParts[1].split('?')[0]; // Get path and remove query params
                const { error } = await supabase.storage.from('company_logos').remove([filePath]);
                if (error) throw error;
            }
            
            // Clear the URL from the profile regardless of storage deletion success
            setFormData(prev => ({ ...prev, company_logo_url: null }));

        } catch (error: any) {
            console.error("Failed to remove logo:", error);
            setUploadError(`Failed to remove logo: ${error.message}`);
        } finally {
            setIsRemovingLogo(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateUser(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const expiryStatus = getExpiryStatus(user.subscription_expires_on);

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-6">
                            <Input label="Company Name" name="companyName" value={formData.companyName || ''} onChange={handleInputChange} />
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Phone Number</label>
                                <div className="flex">
                                    <Select name="phone_country_code" value={formData.phone_country_code || ''} onChange={handleInputChange} className="!rounded-r-none w-28" label="">
                                      <option value="">Code</option>
                                      {COUNTRIES.map(c => <option key={c.code} value={c.dial_code}>{c.code} ({c.dial_code})</option>)}
                                    </Select>
                                    <Input label="" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="!rounded-l-none" />
                                </div>
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-text-secondary mb-1">Company Logo</label>
                             <div className="flex items-center space-x-4">
                                <div className="h-20 w-20 rounded-md bg-surface border border-border flex items-center justify-center">
                                    {formData.company_logo_url ? (
                                        <img src={formData.company_logo_url} alt="Company Logo" className="h-full w-full object-contain rounded-md"/>
                                    ) : (
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <label htmlFor="logo-upload" className={`cursor-pointer bg-surface py-2 px-3 border border-border rounded-md shadow-sm text-sm font-medium text-text-primary hover:bg-background ${isUploading ? 'opacity-50' : ''}`}>
                                        <span>{isUploading ? 'Uploading...' : (formData.company_logo_url ? 'Change Logo' : 'Upload Logo')}</span>
                                        <input id="logo-upload" name="logo-upload" type="file" className="sr-only" onChange={handleLogoUpload} accept="image/png, image/jpeg, image/svg+xml" disabled={isUploading}/>
                                    </label>
                                    {formData.company_logo_url && (
                                        <Button variant="secondary" type="button" onClick={handleRemoveLogo} disabled={isRemovingLogo} className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400">
                                            {isRemovingLogo ? 'Removing...' : 'Remove'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <Input label="Company Website" name="company_website" value={formData.company_website || ''} onChange={handleInputChange} placeholder="https://example.com" />
                            <Input label="Industry" name="industry" value={formData.industry || ''} onChange={handleInputChange} placeholder="e.g., Aerospace Manufacturing" />
                            <Select label="Company Size" name="company_size" value={formData.company_size || ''} onChange={handleInputChange}>
                                <option value="">Select size...</option>
                                <option value="1-10 employees">1-10 employees</option>
                                <option value="11-50 employees">11-50 employees</option>
                                <option value="51-200 employees">51-200 employees</option>
                                <option value="201-500 employees">201-500 employees</option>
                                <option value="501-1000 employees">501-1000 employees</option>
                                <option value="1000+ employees">1000+ employees</option>
                            </Select>
                            <Input label="Tax ID / VAT Number" name="tax_id" value={formData.tax_id || ''} onChange={handleInputChange} />
                        </div>

                        <div className="md:col-span-2">
                          <Input label="Address Line 1" name="address_line1" value={formData.address_line1 || ''} onChange={handleInputChange} />
                        </div>
                        <Input label="City" name="city" value={formData.city || ''} onChange={handleInputChange} />
                        <Input label="State / Province" name="state" value={formData.state || ''} onChange={handleInputChange} />
                        <Input label="Postal / ZIP Code" name="postal_code" value={formData.postal_code || ''} onChange={handleInputChange} />
                        <Select label="Country" name="country" value={formData.country || ''} onChange={handleInputChange}>
                            <option value="">Select a country...</option>
                            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                        </Select>
                    </div>
                </Card>

                 <Card className="mt-8">
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Application Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         <Input label="Calculation Number Prefix" name="calcPrefix" value={formData.calcPrefix || ''} onChange={handleInputChange} />
                         <Input label="Next Calculation Number" name="calcNextNumber" type="number" value={formData.calcNextNumber || 1} onChange={handleInputChange} />
                    </div>
                </Card>

                <Card className="mt-8">
                    <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Subscription & Billing</h2>
                    {isSuperAdmin ? (
                        <p className="text-text-secondary">You have Super Admin access with unlimited features.</p>
                    ) : (
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-text-secondary">Your current plan:</p>
                                <p className="text-lg font-bold text-text-primary">{currentPlan?.name || 'Free'}</p>
                                {expiryStatus.text && (
                                    <p className={`text-sm mt-1 ${expiryStatus.className}`}>
                                        {expiryStatus.text}
                                    </p>
                                )}
                            </div>
                            <Button type="button" onClick={() => onNavigate('subscription')}>
                                Manage Subscription
                            </Button>
                        </div>
                    )}
                </Card>

                <div className="flex justify-end items-center space-x-4 mt-8">
                    {saved && <span className="text-green-400 animate-fade-in">Settings Saved!</span>}
                    <Button type="submit">Save Settings</Button>
                </div>
            </form>
        </div>
    );
};