
import React, { useState, useEffect } from 'react';
import type { SettingsPageProps, User } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { COUNTRIES } from '../constants';
import { supabase } from '../services/supabaseClient';

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, session, onUpdateUser, onNavigate, isSuperAdmin }) => {
    const [formData, setFormData] = useState<User>(user);
    const [saved, setSaved] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isRemovingLogo, setIsRemovingLogo] = useState(false);
    const [uploadError, setUploadError] = useState('');

    useEffect(() => {
        setFormData(user);
    }, [user]);

    const avatarUrl = session?.user?.user_metadata?.avatar_url;
    
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
        const { error } = await supabase.storage.from('company_logos').upload(filePath, file, { cacheControl: '3600', upsert: true });
        if (error) {
            setUploadError(`Failed to upload logo: ${error.message}`);
        } else {
            const { data } = supabase.storage.from('company_logos').getPublicUrl(filePath);
            if (data?.publicUrl) {
                setFormData(prev => ({...prev, company_logo_url: `${data.publicUrl}?t=${new Date().getTime()}`}));
            }
        }
        setIsUploading(false);
    };

    const handleRemoveLogo = async () => {
        if (!formData.company_logo_url || !user) return;
        setIsRemovingLogo(true);
        try {
            const urlParts = formData.company_logo_url.split('/company_logos/');
            if (urlParts.length > 1) {
                const filePath = urlParts[1].split('?')[0];
                await supabase.storage.from('company_logos').remove([filePath]);
            }
            setFormData(prev => ({ ...prev, company_logo_url: null }));
        } catch (error: any) {
            console.error("Failed to remove logo:", error);
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

    const handleRedirectToWordPress = () => {
        window.location.href = 'https://costinghub.com/my-account';
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
            <form onSubmit={handleSubmit}>
                <Card>
                    <h2 className="text-2xl font-bold text-primary border-b border-border pb-3 mb-6 uppercase tracking-tight">Identity</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {avatarUrl && (
                            <div className="md:col-span-2 flex items-center space-x-4 mb-4">
                                <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full border-2 border-primary p-1 shadow-glow-primary/20" />
                                <div>
                                    <h3 className="font-bold text-text-primary">Profile Credentials</h3>
                                    <p className="text-text-secondary text-sm">Synchronized with your primary Google authentication.</p>
                                </div>
                            </div>
                        )}
                        <Input label="Display Name" name="name" value={formData.name} onChange={handleInputChange} />
                        <Input label="Registry Email" name="email" value={formData.email} onChange={handleInputChange} disabled />
                    </div>
                </Card>

                <Card className="mt-8">
                    <h2 className="text-2xl font-bold text-primary border-b border-border pb-3 mb-6 uppercase tracking-tight">Production Profile</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-6">
                            <Input label="Company Name" name="companyName" value={formData.companyName || ''} onChange={handleInputChange} />
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Direct Contact</label>
                                <div className="flex">
                                    <Select name="phone_country_code" value={formData.phone_country_code || ''} onChange={handleInputChange} className="!rounded-r-none w-28" label="">
                                      <option value="">+X</option>
                                      {COUNTRIES.map(c => <option key={c.code} value={c.dial_code}>{c.code} ({c.dial_code})</option>)}
                                    </Select>
                                    <Input label="" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="!rounded-l-none" />
                                </div>
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-text-secondary mb-1">Brand Identity</label>
                             <div className="flex items-center space-x-4">
                                <div className="h-20 w-20 rounded-xl bg-surface border border-border flex items-center justify-center overflow-hidden">
                                    {formData.company_logo_url ? (
                                        <img src={formData.company_logo_url} alt="Logo" className="h-full w-full object-contain p-2"/>
                                    ) : (
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="logo-upload" className={`cursor-pointer bg-surface py-2 px-4 border border-border rounded-md shadow-sm text-xs font-black uppercase tracking-widest text-text-primary hover:bg-background ${isUploading ? 'opacity-50' : ''}`}>
                                        <span>{isUploading ? '...' : (formData.company_logo_url ? 'Modify' : 'Upload')}</span>
                                        <input id="logo-upload" name="logo-upload" type="file" className="sr-only" onChange={handleLogoUpload} accept="image/*" disabled={isUploading}/>
                                    </label>
                                    {formData.company_logo_url && (
                                        <button type="button" onClick={handleRemoveLogo} disabled={isRemovingLogo} className="text-red-500 text-[10px] font-bold uppercase tracking-widest hover:underline text-left">
                                            {isRemovingLogo ? '...' : 'Erase Logo'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <Input label="Industrial Industry" name="industry" value={formData.industry || ''} onChange={handleInputChange} placeholder="e.g., Tool & Die" />
                            <Input label="Corporate URL" name="company_website" value={formData.company_website || ''} onChange={handleInputChange} placeholder="https://" />
                        </div>
                        <div className="md:col-span-2">
                          <Input label="Operational Address" name="address_line1" value={formData.address_line1 || ''} onChange={handleInputChange} />
                        </div>
                        <Input label="City" name="city" value={formData.city || ''} onChange={handleInputChange} />
                        <Select label="Country" name="country" value={formData.country || ''} onChange={handleInputChange}>
                            <option value="">Global</option>
                            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                        </Select>
                    </div>
                </Card>

                <Card className="mt-8 border-2 border-primary/10">
                    <h2 className="text-2xl font-bold text-primary border-b border-border pb-3 mb-6 uppercase tracking-tight">Membership & Billing</h2>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                        <div className="flex-1">
                            <p className="text-xs font-black text-text-muted uppercase tracking-widest mb-1">Active Status</p>
                            <p className="text-2xl font-black text-text-primary uppercase tracking-tighter">
                                {isSuperAdmin ? 'Master Access (Admin)' : (user.plan_name || 'Free Tier')}
                            </p>
                            {user.subscription_expires_on && (
                                <p className="text-xs text-text-muted mt-1 font-bold">
                                    Next billing date: <span className="text-text-primary">{new Date(user.subscription_expires_on).toLocaleDateString()}</span>
                                </p>
                            )}
                        </div>
                        <div className="flex gap-4 w-full sm:w-auto">
                            <Button type="button" variant="secondary" onClick={() => onNavigate('subscription')} className="flex-1 uppercase font-bold tracking-widest text-xs">Usage Report</Button>
                            <Button type="button" onClick={handleRedirectToWordPress} className="flex-1 uppercase font-black tracking-widest text-xs shadow-glow-primary">Manage Subscription →</Button>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end items-center space-x-4 mt-8 sticky bottom-4 z-20">
                    {saved && <span className="text-green-500 font-bold animate-fade-in text-sm uppercase tracking-widest">✓ Confirmed</span>}
                    <Button type="submit" className="shadow-2xl">Commit Changes</Button>
                </div>
            </form>
        </div>
    );
};
