'use client';

import type { VendorInvoice, Company, Vendor } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import api from '@/lib/api';

interface PrintableVendorInvoiceProps {
  invoice: VendorInvoice;
  company: Company;
  vendor: Vendor;
  size: 'a4' | 'thermal';
}

export function PrintableVendorInvoice({ invoice, company, vendor, size }: PrintableVendorInvoiceProps) {
  const subtotal = invoice.totalAmount;
  const total = invoice.totalAmount;

  const logoUrl = company.logo
    ? `${api?.defaults?.baseURL}/uploads/company_images/${company.id}`
    : null;

  const stampUrl = company.stamp
    ? `${api?.defaults?.baseURL}/uploads/company_stamps/${company.id}`
    : null;

  const handlePrint = () => {
    const printStyles = `
      @media print {
        body * { visibility: hidden; }
        .print-container, .print-container * { visibility: visible; }
        .print-container {
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
        @page { size: ${size === 'a4' ? 'A4' : '80mm 200mm'}; margin: ${size === 'a4' ? '15mm' : '5mm'}; }
        * { box-shadow: none !important; text-shadow: none !important; }
        table, th, td { border: 1px solid #d1d5db !important; }
      }
    `;
    const styleElement = document.createElement('style');
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.head.removeChild(styleElement);
      }, 100);
    }, 200);
  };

  const containerClass = size === 'thermal' ? '' : 'bg-white text-gray-900 p-8 font-sans max-w-4xl mx-auto';

  return (
    <div className={`print-container ${containerClass}`}>
      <div className="no-print flex justify-center py-4">
        <Button onClick={handlePrint} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
          <Printer className="mr-2 h-4 w-4" />
          Print Bill
        </Button>
      </div>
      {size === 'a4' ? (
        <>
          {/* Header */}
          <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900 mb-8">
            <div className="flex items-start gap-4">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                {company.address && <p className="text-gray-600 text-sm mt-1">{company.address}</p>}
                {(company.contact1 || company.contact2) && (
                  <p className="text-gray-600 text-sm">Phone: {[company.contact1, company.contact2].filter(Boolean).join(' / ')}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-extrabold tracking-wider text-emerald-600">VENDOR INVOICE</h2>
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-gray-500">Invoice #: <span className="text-gray-900 font-semibold">{invoice.invoiceNumber}</span></p>
                <p className="text-gray-500">Date: <span className="text-gray-900 font-semibold">{invoice.invoiceDate}</span></p>
              </div>
            </div>
          </header>

          {/* Vendor Info */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-700 mb-2 text-sm uppercase tracking-wider">Vendor Information</h3>
            <div className="text-sm text-gray-700">
              <p className="font-semibold">{vendor.name}</p>
              {vendor.address && <p className="text-gray-500">{vendor.address}</p>}
              {vendor.phone && <p className="text-gray-500">Phone: {vendor.phone}</p>}
              {vendor.email && <p className="text-gray-500">Email: {vendor.email}</p>}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left border-collapse text-sm mb-8">
            <thead>
              <tr className="bg-emerald-600 text-white">
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">Product</th>
                <th className="border border-gray-300 p-3 text-center text-xs font-semibold uppercase tracking-wider">Qty</th>
                <th className="border border-gray-300 p-3 text-center text-xs font-semibold uppercase tracking-wider">Unit</th>
                <th className="border border-gray-300 p-3 text-right text-xs font-semibold uppercase tracking-wider">Price</th>
                <th className="border border-gray-300 p-3 text-right text-xs font-semibold uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, index) => (
                <tr key={index} className="hover:bg-emerald-50/50">
                  <td className="border border-gray-300 p-3">{item.productName}</td>
                  <td className="border border-gray-300 p-3 text-center font-semibold">{item.quantity}</td>
                  <td className="border border-gray-300 p-3 text-center">{item.unitType === 'piece' ? 'Pcs' : 'Mtr'}</td>
                  <td className="border border-gray-300 p-3 text-right">{item.unitPrice.toFixed(2)}</td>
                  <td className="border border-gray-300 p-3 text-right font-semibold">{item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="border border-gray-300 p-3" colSpan={4}>TOTAL</td>
                <td className="border border-gray-300 p-3 text-right text-lg">{total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

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
                <p className="text-xs text-gray-500">Vendor Signature</p>
              </div>
            </div>
            <div className="text-center text-gray-600 mt-6">
              <p className="font-bold text-lg text-gray-900">{company.name}</p>
              <p className="text-sm mt-1">Phone: {company.contact1} | Email: {company.email}</p>
              <p className="text-xs text-gray-400 mt-2">Thank you for your business!</p>
            </div>
          </footer>
        </>
      ) : (
        /* Thermal Layout */
        <div style={{ width: '72mm', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.2', padding: '4px' }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{company.name.toUpperCase()}</div>
            <div>{company.address}</div>
            <div>Tel: {[company.contact1, company.contact2].filter(Boolean).join(' / ')}</div>
          </div>
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>VENDOR INVOICE</div>
          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
            <div>Invoice: {invoice.invoiceNumber}</div>
            <div>Date: {invoice.invoiceDate}</div>
            <div>Vendor: {vendor.name}</div>
          </div>
          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
            {invoice.items?.map((item, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.productName} x{item.quantity}</span>
                <span>{item.subtotal.toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', paddingTop: '8px' }}>
            <span>TOTAL:</span>
            <span>{total.toFixed(0)}</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: '8px', borderTop: '1px dashed #000', paddingTop: '8px' }}>
            <div>Thank you for your business!</div>
            <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Generated on {new Date().toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
