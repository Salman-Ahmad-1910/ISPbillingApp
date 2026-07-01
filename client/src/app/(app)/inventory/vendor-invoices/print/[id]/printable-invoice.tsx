'use client';

import type { VendorInvoice, Company, Vendor } from '@/lib/types';
import Image from 'next/image';
import { useEffect } from 'react';

interface PrintableVendorInvoiceProps {
  invoice: VendorInvoice;
  company: Company;
  vendor: Vendor;
  size: 'a4' | 'thermal';
}

export function PrintableVendorInvoice({ invoice, company, vendor, size }: PrintableVendorInvoiceProps) {
  const subtotal = invoice.totalAmount;
  const tax = 0;
  const total = invoice.totalAmount;

  useEffect(() => {
    // Add print styles to the document
    const printStyles = `
      @media print {
        /* Hide everything except the print area */
        body * {
          visibility: hidden;
        }
        
        /* Show only the print container and its children */
        .print-container, .print-container * {
          visibility: visible;
        }
        
        /* Remove all margins and padding from body */
        body {
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        /* Hide scrollbars, navigation, etc. */
        html, body {
          overflow: hidden !important;
        }
        
        /* Ensure the print container takes full page */
        .print-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        
        /* A4 specific styles */
        @page {
          size: ${size === 'a4' ? 'A4' : '80mm 200mm'};
          margin: ${size === 'a4' ? '15mm' : '5mm'};
        }
        
        /* Thermal printer specific styles */
        .thermal-print {
          font-size: 12px;
          line-height: 1.2;
          width: 72mm; /* Standard thermal printer width */
        }
        
        .thermal-print .header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        
        .thermal-print .footer {
          border-top: 1px dashed #000;
          padding-top: 8px;
          margin-top: 8px;
          text-align: center;
          font-size: 10px;
        }
        
        /* A4 specific styles */
        .a4-print {
          font-size: 14px;
          line-height: 1.4;
        }
        
        .a4-print .header {
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        
        .a4-print .footer {
          border-top: 1px solid #000;
          padding-top: 15px;
          margin-top: 30px;
        }
        
        /* Table styles */
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        th, td {
          ${size === 'thermal' ? 'padding: 4px 2px;' : 'padding: 8px 12px;'}
          text-align: left;
          ${size === 'thermal' ? 'border-bottom: 1px dotted #000;' : 'border-bottom: 1px solid #ddd;'}
        }
        
        th {
          font-weight: bold;
          background-color: ${size === 'thermal' ? 'transparent' : '#f8f9fa'};
        }
        
        /* No print class */
        .no-print {
          display: none !important;
        }
      }
    `;

    // Create and append style element
    const styleElement = document.createElement('style');
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);

    // Auto-trigger print dialog
    const timer = setTimeout(() => {
      window.print();
      // Clean up and close window after printing
      setTimeout(() => {
        document.head.removeChild(styleElement);
        window.close();
      }, 100);
    }, 500);

    return () => {
      clearTimeout(timer);
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, [size]);

  const containerClass = size === 'thermal' ? 'thermal-print' : 'a4-print';

  return (
    <div className={`print-container ${containerClass}`}>
      {/* Header */}
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: size === 'thermal' ? '10px' : '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: size === 'thermal' ? '16px' : '24px', fontWeight: 'bold' }}>
              {company.name}
            </h1>
            {company.address && (
              <p style={{ margin: 0, fontSize: size === 'thermal' ? '10px' : '12px', color: '#666' }}>
                {company.address}
              </p>
            )}
            {(company.contact1 || company.contact2) && (
              <p style={{ margin: 0, fontSize: size === 'thermal' ? '10px' : '12px', color: '#666' }}>
               Tel: {[company.contact1, company.contact2].filter(Boolean).join(' / ')}
               </p>
              )}
          </div>
          {company.logo && (
            <Image
              src={company.logo}
              alt={company.name}
              width={size === 'thermal' ? 60 : 100}
              height={size === 'thermal' ? 60 : 100}
              style={{ objectFit: 'contain' }}
            />
          )}
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: size === 'thermal' ? '14px' : '20px', fontWeight: 'bold' }}>
            VENDOR INVOICE
          </h2>
        </div>
      </div>

      {/* Invoice Info */}
      <div style={{ marginBottom: size === 'thermal' ? '15px' : '25px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: size === 'thermal' ? '45%' : '200px' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: size === 'thermal' ? '11px' : '13px' }}>
            Invoice Number:
          </p>
          <p style={{ margin: '0 0 15px 0', fontSize: size === 'thermal' ? '12px' : '14px' }}>
            {invoice.invoiceNumber}
          </p>
          
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: size === 'thermal' ? '11px' : '13px' }}>
            Invoice Date:
          </p>
          <p style={{ margin: '0 0 15px 0', fontSize: size === 'thermal' ? '12px' : '14px' }}>
            {invoice.invoiceDate}
          </p>
        </div>
        
        <div style={{ flex: 1, minWidth: size === 'thermal' ? '45%' : '200px' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: size === 'thermal' ? '11px' : '13px' }}>
            Vendor:
          </p>
          <p style={{ margin: '0 0 5px 0', fontSize: size === 'thermal' ? '12px' : '14px' }}>
            {vendor.name}
          </p>
          {vendor.address && (
            <p style={{ margin: '0 0 5px 0', fontSize: size === 'thermal' ? '10px' : '12px', color: '#666' }}>
              {vendor.address}
            </p>
          )}
          {vendor.phone && (
            <p style={{ margin: '0 0 5px 0', fontSize: size === 'thermal' ? '10px' : '12px', color: '#666' }}>
              Tel: {vendor.phone}
            </p>
          )}
          {vendor.email && (
            <p style={{ margin: '0 0 15px 0', fontSize: size === 'thermal' ? '10px' : '12px', color: '#666' }}>
              Email: {vendor.email}
            </p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table style={{ marginBottom: size === 'thermal' ? '15px' : '20px' }}>
        <thead>
          <tr>
            <th style={{ width: '40%' }}>Product</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Qty</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Unit</th>
            <th style={{ width: '15%', textAlign: 'right' }}>Price</th>
            <th style={{ width: '15%', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map((item, index) => (
            <tr key={index}>
              <td>{item.productName}</td>
              <td style={{ textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ textAlign: 'center' }}>
                {item.unitType === 'piece' ? 'Pcs' : 'Mtr'}
              </td>
              <td style={{ textAlign: 'right' }}>
                {size === 'thermal' ? item.unitPrice.toFixed(0) : item.unitPrice.toFixed(2)}
              </td>
              <td style={{ textAlign: 'right' }}>
                {size === 'thermal' ? item.subtotal.toFixed(0) : item.subtotal.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>
              Subtotal:
            </td>
            <td style={{ textAlign: 'right' }}>
              {size === 'thermal' ? subtotal.toFixed(0) : subtotal.toFixed(2)}
            </td>
          </tr>
          {tax > 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                Tax:
              </td>
              <td style={{ textAlign: 'right' }}>
                {size === 'thermal' ? tax.toFixed(0) : tax.toFixed(2)}
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold', borderTop: size === 'thermal' ? '1px solid #000' : '2px solid #000' }}>
              Total:
            </td>
            <td style={{ textAlign: 'right', fontWeight: 'bold', borderTop: size === 'thermal' ? '1px solid #000' : '2px solid #000' }}>
              {size === 'thermal' ? total.toFixed(0) : total.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Footer */}
      <div className="footer">
        <div style={{ textAlign: 'center', marginBottom: size === 'thermal' ? '10px' : '15px' }}>
          <p style={{ margin: 0, fontSize: size === 'thermal' ? '10px' : '11px', color: '#666' }}>
            Thank you for your business!
          </p>
        </div>
        
        {size === 'a4' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}></div>
              <p style={{ margin: 0, fontSize: '12px' }}>Authorized Signature</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}></div>
              <p style={{ margin: 0, fontSize: '12px' }}>Vendor Signature</p>
            </div>
          </div>
        )}
        
        <div style={{ textAlign: 'center', marginTop: size === 'thermal' ? '5px' : '10px' }}>
          <p style={{ margin: 0, fontSize: size === 'thermal' ? '8px' : '9px', color: '#999' }}>
            Generated on {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
