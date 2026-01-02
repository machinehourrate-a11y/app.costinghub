
import React, { useState, useRef } from 'react';
import type { DocumentationSection, DocumentationPageProps } from '../types';
import { supabase } from '../services/supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const uuid = () => crypto.randomUUID();

const EditableSectionComponent: React.FC<{
    section: DocumentationSection;
    onUpdate: (section: DocumentationSection) => void;
    isSuperAdmin: boolean;
}> = ({ section, onUpdate, isSuperAdmin }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<DocumentationSection>(section);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError('');
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${uuid()}.${fileExt}`;
            const filePath = `public/${fileName}`;

            let { error: uploadError } = await supabase.storage
                .from('documentation_images')
                .upload(filePath, file);

            if (uploadError && (uploadError.message.includes('Bucket not found'))) {
                const { error: createError } = await supabase.storage.createBucket('documentation_images', {
                    public: true,
                    fileSizeLimit: '2MB',
                    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
                });
                if (createError && !createError.message.includes('The resource already exists')) throw createError;
                
                const { error: retryError } = await supabase.storage.from('documentation_images').upload(filePath, file);
                if (retryError) throw retryError;
            } else if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('documentation_images')
                .getPublicUrl(filePath);

            if (data.publicUrl) {
                setEditData(prev => ({ ...prev, image_url: `${data.publicUrl}?t=${new Date().getTime()}` }));
            }
        } catch (error: any) {
            setUploadError(`Upload failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleSave = () => {
        onUpdate(editData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditData(section);
        setIsEditing(false);
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    if (isEditing) {
        return (
            <Card className="space-y-4 border-2 border-primary/50 bg-primary/5 animate-fade-in">
                <Input label="Step Number" name="step" type="number" value={editData.step} onChange={e => setEditData(p => ({...p, step: parseInt(e.target.value) || 0}))} />
                <Input label="Title" name="title" value={editData.title} onChange={handleInputChange} />
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Content (HTML allowed)</label>
                    <textarea
                        name="content"
                        value={editData.content}
                        onChange={handleInputChange}
                        rows={6}
                        className="block w-full px-3 py-2 border rounded-md focus:outline-none sm:text-sm bg-background/50 text-text-input border-border placeholder-text-muted focus:ring-primary focus:border-primary"
                    />
                </div>
                <Input label="Image URL" name="image_url" value={editData.image_url || ''} onChange={handleInputChange} />
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Or Upload New Image</label>
                    <input type="file" onChange={handleFileChange} accept="image/*" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    {isUploading && <p className="text-sm text-text-secondary mt-1">Uploading...</p>}
                    {uploadError && <p className="text-sm text-red-500 mt-1">{uploadError}</p>}
                </div>
                <Input label="Image Caption" name="image_caption" value={editData.image_caption} onChange={handleInputChange} />
                <div className="flex justify-end space-x-2 pt-4 border-t border-border/50">
                    <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6 relative group scroll-mt-24">
            <div className="flex items-center gap-4 border-b border-border pb-3">
                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-2xl shadow-glow-primary transform rotate-3 flex-shrink-0">
                    {section.step}
                </div>
                <h2 className="text-3xl font-black text-text-primary uppercase tracking-tighter">{section.title}</h2>
                 {isSuperAdmin && (
                    <Button variant="secondary" onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto !px-4 !py-2">
                        Edit
                    </Button>
                )}
            </div>
            <div className="pl-0 sm:pl-16">
                <div className="prose dark:prose-invert max-w-none text-text-secondary leading-relaxed" dangerouslySetInnerHTML={{ __html: section.content }} />
                {section.image_url && (
                    <figure className="my-8">
                        <img src={section.image_url} alt={section.image_caption} className="w-full rounded-lg shadow-xl border-2 border-border" />
                        <figcaption className="text-center text-sm text-text-muted mt-3 italic">{section.image_caption}</figcaption>
                    </figure>
                )}
            </div>
        </div>
    );
};

export const DocumentationPage: React.FC<DocumentationPageProps> = ({ content, onUpdate, isSuperAdmin }) => {
    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in space-y-24 pb-24">
            <header className="text-center space-y-4">
                <h1 className="text-5xl font-black text-primary tracking-tighter uppercase">User Guide</h1>
                <p className="text-xl text-text-secondary max-w-2xl mx-auto">A step-by-step walkthrough of the CostingHub application.</p>
            </header>
            
            {content.sort((a,b) => a.step - b.step).map(sectionData => (
                <EditableSectionComponent
                    key={sectionData.id}
                    section={sectionData}
                    onUpdate={onUpdate}
                    isSuperAdmin={isSuperAdmin}
                />
            ))}
        </div>
    );
};
