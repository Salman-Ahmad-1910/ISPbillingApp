'use client';

import type { Purchase, Company } from '@/lib/types';
import { useEffect } from 'react';

interface PrintablePurchaseInvoiceProps {
  purchase: Purchase;
  company: Company;
}

export function PrintablePurchaseInvoice({ purchase, company }: PrintablePurchaseInvoiceProps) {
  useEffect(() => {
    const printStyles = `
      @media print {
        body * { visibility: hidden; }
        .print-container, .print-container * { visibility: visible; }
        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { overflow: hidden !important; }
        .print-container { position: absolute; left: 0; top: 0; width: 100%; }
        @page { size: A4; margin: 15mm; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { font-weight: bold; background-color: #f8f9fa; }
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);

    const timer = setTimeout(() => {
      window.print();
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
  }, []);

  const subtotal = (purchase.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.purchasePrice || 0)), 0);
  const discount = purchase.discount || 0;
  const salesTax = purchase.salesTax || 0;
  const wthTax = purchase.wthTax || 0;
  const total = purchase.totalAmount || (subtotal - discount + salesTax + wthTax);
  const remaining = purchase.remainingAmount ?? total;

  return (
    <div className="print-container" style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '1.4', color: '#333', padding: '20px' }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#000' }}>
              {company.name || 'Company Name'}
            </h1>
            {company.address && (
              <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>{company.address}</p>
            )}
            {company.contact1 && (
              <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>Tel: {company.contact1}</p>
            )}
            {company.email && (
              <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>Email: {company.email}</p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#2563eb' }}>
              PURCHASE INVOICE
            </h2>
          </div>
        </div>
      </div>

      {/* Invoice Info & Vendor Details */}
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '13px' }}>Invoice Details</p>
          <table style={{ width: 'auto', border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 8px 2px 0', border: 'none', fontWeight: 'bold', fontSize: '12px', color: '#666' }}>Bill ID:</td>
                <td style={{ padding: '2px 0', border: 'none', fontSize: '13px' }}>{purchase.billId || purchase.purchaseNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 8px 2px 0', border: 'none', fontWeight: 'bold', fontSize: '12px', color: '#666' }}>Date:</td>
                <td style={{ padding: '2px 0', border: 'none', fontSize: '13px' }}>{purchase.purchaseDate}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 8px 2px 0', border: 'none', fontWeight: 'bold', fontSize: '12px', color: '#666' }}>Batch:</td>
                <td style={{ padding: '2px 0', border: 'none', fontSize: '13px' }}>{purchase.batch || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '13px' }}>Vendor Information</p>
          <p style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 'bold' }}>{purchase.vendorName}</p>
          {purchase.vendorId && (
            <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>Vendor ID: {purchase.vendorId}</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table>
        <thead>
          <tr>
            <th style={{ width: '15%' }}>Product ID</th>
            <th style={{ width: '30%' }}>Product Name</th>
            <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>
            <th style={{ width: '15%', textAlign: 'right' }}>Purchase Price</th>
            <th style={{ width: '15%', textAlign: 'right' }}>Selling Price</th>
            <th style={{ width: '15%', textAlign: 'right' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {purchase.items?.map((item, index) => (
            <tr key={index}>
              <td style={{ fontSize: '12px', fontFamily: 'monospace', color: '#666' }}>
                {item.productId.slice(0, 8)}...
              </td>
              <td>{item.productName}</td>
              <td style={{ textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right' }}>{(item.purchasePrice || 0).toFixed(2)}</td>
              <td style={{ textAlign: 'right' }}>{(item.sellingPrice || 0).toFixed(2)}</td>
              <td style={{ textAlign: 'right' }}>{(item.subtotal || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <table style={{ width: '350px', border: 'none' }}>
          <tbody>
            <tr>
              <td style={{ padding: '6px 12px', border: 'none', textAlign: 'right', fontWeight: 'bold' }}>Subtotal:</td>
              <td style={{ padding: '6px 12px', border: 'none', textAlign: 'right' }}>{subtotal.toFixed(2)}</td>
            </tr>
            {discount > 0 && (
              <tr>
                <td style={{ padding: '6px 12px', border: 'none', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>Discount:</td>
                <td style={{ padding: '6px 12px', border: 'none', textAlign: 'right', color: '#dc2626' }}>-{discount.toFixed(2)}</td>
              </tr>
            )}
            {salesTax > 0 && (
              <tr>
                <td style={{ padding: '6px 12px', border: 'none', textAlign: 'right', fontWeight: 'bold' }}>Sales Tax:</td>
                <td style={{ padding: '6px 12px', border: 'none', textAlign: 'right' }}>+{salesTax.toFixed(2)}</td>
              </tr>
            )}
            {wthTax > 0 && (
              <tr>
                <td style={{ padding: '6px 12px', border: 'none', textAlign: 'right', fontWeight: 'bold' }}>WTH Tax:</td>
                <td style={{ padding: '6px 12px', border: 'none', textAlign: 'right' }}>+{wthTax.toFixed(2)}</td>
              </tr>
            )}
            <tr>
              <td style={{ padding: '8px 12px', borderTop: '2px solid #000', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>Total Amount:</td>
              <td style={{ padding: '8px 12px', borderTop: '2px solid #000', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>
                {total.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px 12px', border: 'none', textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>Remaining:</td>
              <td style={{ padding: '6px 12px', border: 'none', textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>
                {remaining.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Status */}
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block',
          padding: '4px 16px',
          borderRadius: '4px',
          fontWeight: 'bold',
          fontSize: '13px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          backgroundColor: purchase.status === 'paid' ? '#dcfce7' : purchase.status === 'partial' ? '#fef9c3' : '#fee2e2',
          color: purchase.status === 'paid' ? '#16a34a' : purchase.status === 'partial' ? '#ca8a04' : '#dc2626'
        }}>
          {purchase.status === 'paid' ? 'PAID' : purchase.status === 'partial' ? 'PARTIAL' : 'UNPAID'}
        </span>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #000', paddingTop: '15px', marginTop: '30px', textAlign: 'center' }}>
        <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>
          Thank you for your business!
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}></div>
            <p style={{ margin: 0, fontSize: '12px' }}>Authorized Signature</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}></div>
            <p style={{ margin: 0, fontSize: '12px' }}>Receiver Signature</p>
          </div>
        </div>
        <p style={{ margin: '15px 0 0 0', fontSize: '10px', color: '#999' }}>
          Generated on {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}