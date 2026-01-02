import React, { useState } from 'react';
import type { QuoteModalProps } from '../types';
import { Button } from './ui/Button';
import { ResultsDisplay } from './ResultsDisplay';

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(value);
  } catch (e) {
    return `$${value.toFixed(2)}`;
  }
};

const DEFAULT_TERMS = "This quote is valid for 30 days.\nPayment terms: Net 30 upon receipt of invoice.\nDelivery: FOB Shipping Point, freight costs to be borne by the customer.\nAll work is performed to industry-standard tolerances unless otherwise specified on the drawing.";

export const QuoteModal: React.FC<QuoteModalProps> = ({ calculation, user, onClose, onUpgrade }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [billTo, setBillTo] = useState(calculation.inputs.customerName || '');
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [isExporting, setIsExporting] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);


  if (!calculation.results) return null;

  const { inputs, results } = calculation;
  const currency = inputs.currency || 'USD';

  const handleExportPdf = () => {
    if (!user.features?.can_export_pdf) {
        setUpgradeMessage("PDF export is a premium feature. Please upgrade your plan to use it.");
        return;
    }
    setUpgradeMessage(null);
    setIsExporting(true);
    const element = document.getElementById('quote-modal-content');
    
    // Temporarily hide actions and scrollbar for the capture
    const originalStyle = element?.style.cssText;
    if (element) {
        element.style.height = 'auto'; // Expand full height
        element.style.overflow = 'visible';
    }

    // Configure html2pdf options
    const opt = {
      margin:       [5, 5, 5, 5], // Small margins
      filename:     `Quote_${inputs.calculationNumber || 'Draft'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Use window.html2pdf (loaded via script in index.html)
    // @ts-ignore
    if (window.html2pdf) {
        // @ts-ignore
        window.html2pdf().set(opt).from(element).save().then(() => {
            setIsExporting(false);
            if (element && originalStyle) {
                element.style.cssText = originalStyle; // Restore style
            } else if (element) {
                element.style.height = '90vh';
                element.style.overflow = 'hidden';
            }
        }).catch((err: any) => {
            console.error("PDF Export failed:", err);
            setIsExporting(false);
            if (element && originalStyle) {
                element.style.cssText = originalStyle; // Restore style
            } else if (element) {
                element.style.height = '90vh';
                element.style.overflow = 'hidden';
            }
            alert("Failed to export PDF. Please try printing instead.");
        });
    } else {
        // Fallback if library didn't load
        window.print();
        setIsExporting(false);
    }
  };
  
  const userAddressComponents = [
      user.address_line1,
      user.city,
      user.state ? `${user.state} ${user.postal_code || ''}` : user.postal_code,
      user.country
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div id="quote-modal-content" className="bg-surface printable-bg-surface w-full max-w-4xl h-[90vh] flex flex-col rounded-lg shadow-2xl border border-border printable-border">
        {/* Header and Actions */}
        <div className="flex justify-between items-center p-4 border-b border-border printable-border no-print" data-html2canvas-ignore="true">
            <h2 className="text-xl font-bold text-primary">Quote Generator</h2>
            <div className="flex items-center space-x-4">
                <Button variant="secondary" onClick={handleExportPdf} disabled={isExporting}>
                    {isExporting ? 'Exporting...' : 'Export PDF'}
                </Button>
                <button onClick={onClose} className="text-text-muted hover:text-text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
        
        {upgradeMessage && (
            <div className="p-4 bg-yellow-500/10 text-yellow-600 border-b border-yellow-500/20 text-sm font-medium text-center no-print" data-html2canvas-ignore="true">
                {upgradeMessage}
                <button onClick={onUpgrade} className="ml-2 font-bold underline hover:text-yellow-500">Upgrade Plan</button>
            </div>
        )}

        {/* Quote Body */}
        <div className="flex-1 overflow-y-auto p-8 printable-text-primary">
            {/* Quote Header */}
            <div className="flex justify-between items-start mb-8 border-b border-border printable-border pb-6">
                {/* User / Vendor Information (Left) */}
                <div className="flex flex-col space-y-2">
                    {user.company_logo_url ? (
                        <div className="h-16 w-auto mb-2">
                            <img src={user.company_logo_url} alt="Company Logo" className="max-h-full object-contain" crossOrigin="anonymous" />
                        </div>
                    ) : (
                        <h1 className="text-2xl font-bold printable-text-primary uppercase tracking-wide">{user.companyName || user.name}</h1>
                    )}
                    
                    {/* User Address Block */}
                    <div className="text-sm text-text-secondary printable-text-secondary leading-snug">
                        {user.companyName && !user.company_logo_url && <p className="font-semibold">{user.name}</p>}
                        {userAddressComponents.map((line, idx) => (
                            <p key={idx}>{line}</p>
                        ))}
                        <p>{user.email}</p>
                        {user.phone && <p>{user.phone_country_code} {user.phone}</p>}
                    </div>
                </div>

                {/* Branding & Document Type (Right) */}
                <div className="text-right">
                    <div className="flex flex-col items-end mb-4">
                        <h2 className="text-3xl font-bold text-text-primary printable-text-primary">
                            Costing<span className="text-primary">Hub</span>
                        </h2>
                        <p className="text-xs text-text-primary printable-text-primary italic">All Costs. One Hub.</p>
                    </div>
                    <h2 className="text-4xl font-bold text-text-primary printable-text-primary tracking-tight">QUOTE</h2>
                </div>
            </div>

            {/* Quote Meta Data */}
            <div className="flex justify-between items-end mb-8">
                 <div className="w-1/2">
                    <h3 className="text-xs font-bold text-text-secondary printable-text-secondary uppercase tracking-wider mb-1">To</h3>
                     <textarea
                        className="w-full p-2 bg-background/50 border border-border rounded-md text-text-primary printable-text-primary no-print resize-none"
                        value={billTo}
                        onChange={(e) => setBillTo(e.target.value)}
                        rows={4}
                        placeholder="Client Name&#10;Client Address&#10;City, State, Zip"
                        data-html2canvas-ignore="true"
                    />
                    <div className="hidden print:block text-text-primary printable-text-primary whitespace-pre-wrap leading-relaxed" style={{ display: 'block' }}>{billTo}</div>
                </div>
                
                <div className="w-1/3 text-right space-y-1">
                    <div className="flex justify-between">
                        <span className="font-semibold text-text-secondary printable-text-secondary">Quote #:</span>
                        <span className="font-bold text-text-primary printable-text-primary">{inputs.calculationNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-semibold text-text-secondary printable-text-secondary">Date:</span>
                        <span className="text-text-primary printable-text-primary">{new Date(inputs.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-semibold text-text-secondary printable-text-secondary">Prepared By:</span>
                        <span className="text-text-primary printable-text-primary">{user.name}</span>
                    </div>
                </div>
            </div>

            {/* Product Image */}
            {inputs.partImage && (
                <div className="mb-8 flex justify-center">
                    <div className="border border-border printable-border p-2 rounded-lg bg-white inline-block">
                        <img src={inputs.partImage} alt="Part" className="max-w-xs max-h-48 object-contain" crossOrigin="anonymous" />
                    </div>
                </div>
            )}


            {/* Line Items Table */}
            <div className="overflow-hidden border border-border printable-border rounded-lg mb-6">
              <table className="min-w-full divide-y divide-border printable-border">
                <thead className="bg-background/50 printable-bg-surface">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-text-secondary printable-text-secondary uppercase tracking-wider">Part Number</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-text-secondary printable-text-secondary uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-text-secondary printable-text-secondary uppercase tracking-wider">Qty</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-text-secondary printable-text-secondary uppercase tracking-wider">Unit Price</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-text-secondary printable-text-secondary uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-surface printable-bg-surface divide-y divide-border printable-border">
                    <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary printable-text-primary">{inputs.partNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary printable-text-secondary">{inputs.partName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary printable-text-secondary text-center">{inputs.batchVolume}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary printable-text-secondary text-right">{formatCurrency(results.costPerPart, currency)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-text-primary printable-text-primary text-right">{formatCurrency(results.totalCost, currency)}</td>
                    </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
                <div className="w-full max-w-sm bg-primary/5 printable-bg-surface border border-primary/20 printable-border p-4 rounded-lg">
                    <div className="flex justify-between items-center text-xl font-bold text-primary">
                        <span>Grand Total</span>
                        <span>{formatCurrency(results.totalCost, currency)}</span>
                    </div>
                </div>
            </div>
            
            {/* Terms and Conditions */}
            <div className="mt-12 border-t border-border printable-border pt-6">
                <h3 className="text-sm font-bold text-text-secondary printable-text-secondary uppercase tracking-wider mb-2">Terms & Conditions</h3>
                <textarea
                    className="w-full p-2 bg-background/50 border border-border rounded-md text-sm text-text-secondary printable-text-primary no-print resize-y"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    rows={4}
                    data-html2canvas-ignore="true"
                />
                <div className="hidden print:block text-xs text-text-secondary printable-text-secondary whitespace-pre-wrap leading-relaxed" style={{ display: 'block' }}>{terms}</div>
            </div>

            {/* Breakdown Toggle */}
            <div className="mt-8 pt-4 border-t border-border printable-border">
                 <div className="flex items-center no-print" data-html2canvas-ignore="true">
                    <input 
                        id="show-breakdown" 
                        type="checkbox" 
                        checked={showBreakdown} 
                        onChange={() => setShowBreakdown(!showBreakdown)}
                        className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary" 
                    />
                    <label htmlFor="show-breakdown" className="ml-2 text-sm text-text-secondary printable-text-secondary cursor-pointer">Show Detailed Cost Breakdown</label>
                </div>
                 {showBreakdown && (
                    <div className="mt-4 animate-fade-in print:block">
                        <h3 className="text-lg font-bold text-primary mb-2 print:text-black">Internal Cost Breakdown</h3>
                        <ResultsDisplay results={results} currency={currency} markups={inputs.markups} />
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-auto pt-8 border-t border-border printable-border">
                <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left text-xs text-text-muted printable-text-secondary">
                    <div className="mb-2 md:mb-0">
                        <p className="font-bold text-text-primary printable-text-primary">Costing<span className="text-primary">Hub</span></p>
                        <p className="text-text-primary printable-text-primary">All Costs. One Hub.</p>
                    </div>
                    <div className="text-center">
                        <p>Thank you for your business! Prices are in {currency}.</p>
                    </div>
                    <div className="mt-2 md:mt-0 italic">
                        Generated by costinghub.com
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
