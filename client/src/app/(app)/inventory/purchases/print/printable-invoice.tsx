'use client';

import type { Purchase, Company } from '@/lib/types';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';

interface PrintablePurchaseInvoiceProps {
  purchase: Purchase;
  company: Company;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PrintablePurchaseInvoice({ purchase, company, open, onOpenChange }: PrintablePurchaseInvoiceProps) {
  const printContainerRef = useRef<HTMLDivElement>(null);
  const isDialog = open !== undefined && onOpenChange !== undefined;

  const logoUrl = company.logo
    ? `${api?.defaults?.baseURL}/uploads/company_images/${company.id}`
    : null;

  const stampUrl = company.stamp
    ? `${api?.defaults?.baseURL}/uploads/company_stamps/${company.id}`
    : null;

  useEffect(() => {
    if (isDialog && !open) return;
    const printStyles = `
      @media print {
        body * { visibility: hidden; }
        .print-purchase-container, .print-purchase-container * { visibility: visible; }
        .print-purchase-container {
          position: absolute !important;
          left: 0;
          top: 0;
          width: 100%;
        }
        .no-print { display: none !important; }
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        html, body { overflow: hidden !important; }
        @page { size: A4; margin: 15mm; }
        * { box-shadow: none !important; text-shadow: none !important; }
        table, th, td { border: 1px solid #d1d5db !important; }
      }
    `;
    const styleElement = document.createElement('style');
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);
    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, [open]);

  const handlePrint = () => {
    window.print();
  };

  const receivableAmount = (purchase.items || []).reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const previousAmount = purchase.remainingAmount ?? 0;
  const billSubtotal = previousAmount + receivableAmount;

  const content = (
    <>
      <div className="no-print sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Purchase Invoice - Print Preview</h2>
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={handlePrint}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
          {isDialog && (
            <Button variant="outline" size="sm" onClick={() => onOpenChange?.(false)}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Close
            </Button>
          )}
        </div>
      </div>
      <div ref={printContainerRef} className="print-purchase-container bg-white text-gray-900 p-8 font-sans max-w-4xl mx-auto">
          {/* Header */}
          <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900 mb-8">
            <div className="flex items-start gap-4">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company.name || 'Company Name'}</h1>
                {company.address && <p className="text-gray-600 text-sm mt-1">{company.address}</p>}
                {company.contact1 && <p className="text-gray-600 text-sm">Phone: {company.contact1}</p>}
                {company.email && <p className="text-gray-600 text-sm">Email: {company.email}</p>}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-extrabold tracking-wider text-emerald-600">INVOICE</h2>
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-gray-500">Bill ID: <span className="text-gray-900 font-semibold">{purchase.billId || purchase.purchaseNumber}</span></p>
                <p className="text-gray-500">Date: <span className="text-gray-900 font-semibold">{purchase.purchaseDate}</span></p>
                <p className="text-gray-500">Batch: <span className="text-gray-900 font-semibold">{purchase.batch || '-'}</span></p>
                <p className="text-gray-500">Status:
                  <span className={`ml-1 px-2 py-0.5 rounded text-xs font-semibold ${
                    purchase.status === 'paid' ? 'bg-green-100 text-green-800' :
                    purchase.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {purchase.status === 'paid' ? 'PAID' : purchase.status === 'partial' ? 'PARTIAL' : 'UNPAID'}
                  </span>
                </p>
              </div>
            </div>
          </header>

          {/* Vendor Info */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-700 mb-2 text-sm uppercase tracking-wider">Vendor Information</h3>
            <div className="text-sm text-gray-700">
              <p className="font-semibold">{purchase.vendorName}</p>
              {purchase.vendorId && <p className="text-gray-500">Vendor ID: {purchase.vendorId}</p>}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left border-collapse text-sm mb-8">
            <thead>
              <tr className="bg-emerald-600 text-white">
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">Product</th>
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">SN</th>
                <th className="border border-gray-300 p-3 text-right text-xs font-semibold uppercase tracking-wider">Price</th>
                <th className="border border-gray-300 p-3 text-center text-xs font-semibold uppercase tracking-wider">Quantity</th>
                <th className="border border-gray-300 p-3 text-right text-xs font-semibold uppercase tracking-wider">Sale Tax</th>
                <th className="border border-gray-300 p-3 text-right text-xs font-semibold uppercase tracking-wider">WTH</th>
                <th className="border border-gray-300 p-3 text-right text-xs font-semibold uppercase tracking-wider">Disc</th>
                <th className="border border-gray-300 p-3 text-right text-xs font-semibold uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items?.map((item, index) => (
                <tr key={index} className="hover:bg-emerald-50/50">
                  <td className="border border-gray-300 p-3">{item.productName}</td>
                  <td className="border border-gray-300 p-3 text-xs font-mono">{item.serialNumber || '-'}</td>
                  <td className="border border-gray-300 p-3 text-right">{(item.purchasePrice || 0).toFixed(2)}</td>
                  <td className="border border-gray-300 p-3 text-center font-semibold">{item.quantity}</td>
                  <td className="border border-gray-300 p-3 text-right">{(item.saleTax || 0).toFixed(2)}</td>
                  <td className="border border-gray-300 p-3 text-right">{(item.wthTax || 0).toFixed(2)}</td>
                  <td className="border border-gray-300 p-3 text-right">{(item.disc || 0).toFixed(2)}</td>
                  <td className="border border-gray-300 p-3 text-right font-semibold">{(item.subtotal || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div className="flex justify-end mb-8">
            <table className="w-72">
              <tbody>
                <tr>
                  <td className="py-1 text-sm text-gray-500">Previous Amount</td>
                  <td className="py-1 text-sm text-right">{previousAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-sm text-gray-500">Receivable Amount</td>
                  <td className="py-1 text-sm text-right">{receivableAmount.toFixed(2)}</td>
                </tr>
                <tr className="border-t-2 border-gray-900">
                  <td className="py-2 font-bold text-sm uppercase">Subtotal</td>
                  <td className="py-2 text-right font-bold text-lg">{billSubtotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-gray-300">
            <div className="flex justify-between items-end">
              <div style={{ textAlign: 'center' }}>
                {stampUrl ? (
                  <img
                    src={stampUrl}
                    alt="Company Stamp"
                    style={{ maxHeight: '80px', maxWidth: '180px', objectFit: 'contain', marginBottom: '5px' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}></div>
                )}
                <p className="text-xs text-gray-500">Company Stamp</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}></div>
                <p className="text-xs text-gray-500">Receiver Signature</p>
              </div>
            </div>
            <div className="text-center text-gray-600 mt-6">
              <p className="font-bold text-lg text-gray-900">{company.name}</p>
              <p className="text-sm mt-1">Phone: {company.contact1} | Email: {company.email}</p>
              <p className="text-xs text-gray-400 mt-2">Thank you for your business!</p>
            </div>
          </footer>
        </div>
    </>
  );

  if (isDialog) {
    return (
      <Dialog open={open!} onOpenChange={onOpenChange!}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 gap-0">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}
