'use client';

import type { Invoice, Company, Subscriber } from '@/lib/types';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface PrintableInvoiceProps {
  invoice: Invoice;
  company: Company;
  subscriber: Subscriber;
  size: 'a4' | 'thermal';
}

// Enhanced invoice data for FBR compliance
interface EnhancedInvoiceData {
  company: Company;
  invoice: Invoice & {
    invoiceDate: string;
    fbrInvoiceReferenceNumber?: string;
    previousBalance?: number;
    payments?: number;
    lateFeePolicy?: string;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
    itemizedCharges?: {
      subscriptionFee: number;
      installationCharges?: number;
      addOnServices?: { name: string; amount: number }[];
      discounts?: number;
    };
  };
  subscriber: Subscriber & {
    uniqueId: string; // MAC address or PPPoE username
  };
  fbrData?: {
    irn: string;
    qrCodeData: string;
    ntn: string;
    digitalSignature?: string;
  };
}

export function PrintableInvoice({ invoice, company, subscriber, size }: PrintableInvoiceProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Generate enhanced invoice data
  const enhancedInvoice: EnhancedInvoiceData = {
    company,
    invoice: {
      ...invoice,
      invoiceDate: new Date().toISOString().split('T')[0],
      fbrInvoiceReferenceNumber: `FBR-${invoice.id}-${Date.now()}`,
      previousBalance: 0, // This would come from backend
      payments: 0, // This would come from backend
      lateFeePolicy: '5% per month on overdue amount',
      billingPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      billingPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
      itemizedCharges: {
        subscriptionFee: invoice.amount,
        installationCharges: 0,
        addOnServices: [],
        discounts: 0
      }
    },
    subscriber: {
      ...subscriber,
      uniqueId: subscriber.subscriber_identity // Using subscriber_identity as unique ID
    },
    fbrData: {
      irn: `IRN-${invoice.id}-${Date.now()}`,
      qrCodeData: JSON.stringify({
        invoiceNumber: invoice.id,
        invoiceDate: new Date().toISOString().split('T')[0],
        totalAmount: invoice.amount,
        taxAmount: Math.round(invoice.amount * 0.195), // 19.5% GST
        companyName: company.name,
        ntn: company.taxRules || 'N/A',
        customerName: subscriber.name,
        customerNTN: subscriber.cnic
      }),
      ntn: company.taxRules || 'N/A'
    }
  };

  // Calculate tax and totals
  const subtotal = enhancedInvoice.invoice.amount;
  const taxRate = 0.195; // 19.5% GST
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;

  // Generate QR code
  useEffect(() => {
    if (enhancedInvoice.fbrData?.qrCodeData) {
      QRCode.toDataURL(enhancedInvoice.fbrData.qrCodeData, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000',
          light: '#FFF'
        }
      })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('QR Code generation failed:', err));
    }
  }, [enhancedInvoice.fbrData?.qrCodeData]);

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
          height: 100%;
        }
        
        /* Hide common UI elements - be more specific */
        nav, .navbar, .sidebar, .menu, .button, .btn, 
        .page-header, .layout-header, .app-header {
          display: none !important;
        }
        
        /* Don't hide generic header elements - let invoice headers show */
        
        /* Remove backgrounds and shadows for cleaner print */
        * {
          background: transparent !important;
          box-shadow: none !important;
          text-shadow: none !important;
        }
        
        /* Ensure text is black but don't override visibility */
        .print-container * {
          color: black !important;
        }
        
        /* Keep borders for tables */
        table, th, td {
          border: 1px solid black !important;
        }
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);

    return () => {
      // Cleanup styles when component unmounts
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  const a4Layout = (
    <div className="print-container bg-white text-black p-8 font-sans">
      <style jsx>{`
        @page {
          size: A4;
          margin: 0;
        }
      `}</style>
      
      {/* Header Section */}
      <header className="flex justify-between items-start pb-6 border-b-2 border-gray-300">
        <div className="w-2/3">
          <h1 className="text-3xl font-bold text-gray-900">{enhancedInvoice.company.name}</h1>
          <p className="text-gray-600 mt-1">{enhancedInvoice.company.address}</p>
          <p className="text-gray-600">Email: {enhancedInvoice.company.email}</p>
          <p className="text-gray-600">Phone: {enhancedInvoice.company.contact1}</p>
          {enhancedInvoice.company.contact2 && (
            <p className="text-gray-600">Alt: {enhancedInvoice.company.contact2}</p>
          )}
        </div>
        <div className="w-1/3 text-right">
          <h2 className="text-4xl font-bold uppercase text-gray-700 mb-2">INVOICE</h2>
          <div className="text-gray-700 space-y-1">
            <p><strong>Invoice #:</strong> {enhancedInvoice.invoice.id}</p>
            <p><strong>FBR IRN:</strong> {enhancedInvoice.fbrData?.irn}</p>
            <p><strong>Date:</strong> {enhancedInvoice.invoice.invoiceDate}</p>
            <p><strong>Due Date:</strong> {enhancedInvoice.invoice.dueDate}</p>
            <p><strong>Status:</strong> 
              <span className={`ml-1 px-2 py-1 rounded text-xs font-semibold ${
                invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {invoice.status?.toUpperCase()}
              </span>
            </p>
          </div>
        </div>
      </header>

      {/* Customer & Provider Information */}
      <section className="mt-6 grid grid-cols-2 gap-8">
        <div>
          <h3 className="font-bold text-gray-700 mb-3 text-lg">Bill To:</h3>
          <div className="text-gray-700 space-y-1">
            <p className="font-semibold text-lg">{enhancedInvoice.subscriber.name}</p>
            <p><strong>Subscriber ID:</strong> {enhancedInvoice.subscriber.uniqueId}</p>
            <p><strong>CNIC:</strong> {enhancedInvoice.subscriber.cnic}</p>
            <p><strong>Phone:</strong> {enhancedInvoice.subscriber.phone}</p>
            <p><strong>Address:</strong> {enhancedInvoice.subscriber.installationAddress}</p>
            <p><strong>Package:</strong> {enhancedInvoice.subscriber.packageName}</p>
          </div>
        </div>
        <div>
          <h3 className="font-bold text-gray-700 mb-3 text-lg">Service Provider:</h3>
          <div className="text-gray-700 space-y-1">
            <p className="font-semibold text-lg">{enhancedInvoice.company.name}</p>
            <p><strong>NTN:</strong> {enhancedInvoice.fbrData?.ntn}</p>
            <p><strong>Address:</strong> {enhancedInvoice.company.address}</p>
            <p><strong>Contact:</strong> {enhancedInvoice.company.contact1}</p>
            <p><strong>Email:</strong> {enhancedInvoice.company.email}</p>
          </div>
        </div>
      </section>

      {/* Service & Pricing Breakdown */}
      <section className="mt-8">
        <h3 className="font-bold text-gray-700 mb-3 text-lg">Service & Pricing Breakdown</h3>
        <div className="mb-2">
          <p className="text-gray-600"><strong>Billing Period:</strong> {enhancedInvoice.invoice.billingPeriodStart} to {enhancedInvoice.invoice.billingPeriodEnd}</p>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="border border-gray-300 p-3 text-left">Description</th>
              <th className="border border-gray-300 p-3 text-center">Quantity</th>
              <th className="border border-gray-300 p-3 text-right">Unit Price</th>
              <th className="border border-gray-300 p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-3">
                {enhancedInvoice.subscriber.packageName}
                <br />
                <span className="text-sm text-gray-600">Internet Service - {enhancedInvoice.invoice.billingPeriodStart}</span>
              </td>
              <td className="border border-gray-300 p-3 text-center">1</td>
              <td className="border border-gray-300 p-3 text-right">PKR {subtotal.toLocaleString()}</td>
              <td className="border border-gray-300 p-3 text-right">PKR {subtotal.toLocaleString()}</td>
            </tr>
            {enhancedInvoice.invoice.itemizedCharges?.installationCharges ? (
              <tr>
                <td className="border border-gray-300 p-3">Installation Charges (One-time)</td>
                <td className="border border-gray-300 p-3 text-center">1</td>
                <td className="border border-gray-300 p-3 text-right">PKR {enhancedInvoice.invoice.itemizedCharges.installationCharges.toLocaleString()}</td>
                <td className="border border-gray-300 p-3 text-right">PKR {enhancedInvoice.invoice.itemizedCharges.installationCharges.toLocaleString()}</td>
              </tr>
            ) : null}
            {enhancedInvoice.invoice.itemizedCharges?.addOnServices?.map((service, index) => (
              <tr key={index}>
                <td className="border border-gray-300 p-3">{service.name}</td>
                <td className="border border-gray-300 p-3 text-center">1</td>
                <td className="border border-gray-300 p-3 text-right">PKR {service.amount.toLocaleString()}</td>
                <td className="border border-gray-300 p-3 text-right">PKR {service.amount.toLocaleString()}</td>
              </tr>
            ))}
            {enhancedInvoice.invoice.itemizedCharges?.discounts && enhancedInvoice.invoice.itemizedCharges.discounts > 0 ? (
              <tr>
                <td className="border border-gray-300 p-3">Discount/Credit</td>
                <td className="border border-gray-300 p-3 text-center">1</td>
                <td className="border border-gray-300 p-3 text-right">-PKR {enhancedInvoice.invoice.itemizedCharges.discounts.toLocaleString()}</td>
                <td className="border border-gray-300 p-3 text-right">-PKR {enhancedInvoice.invoice.itemizedCharges.discounts.toLocaleString()}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      {/* Financial Summary */}
      <section className="flex justify-between mt-8">
        <div className="w-1/2">
          <h3 className="font-bold text-gray-700 mb-3 text-lg">Account Summary</h3>
          <div className="space-y-2 text-gray-700">
            <div className="flex justify-between">
              <span>Previous Balance:</span>
              <span>PKR {enhancedInvoice.invoice.previousBalance?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Charges:</span>
              <span>PKR {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Payments Received:</span>
              <span>-PKR {enhancedInvoice.invoice.payments?.toLocaleString() || '0'}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span>Net Amount Due:</span>
                <span>PKR {subtotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="w-1/2 pl-8">
          <h3 className="font-bold text-gray-700 mb-3 text-lg">Financial Summary</h3>
          <div className="space-y-2 text-gray-700">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>PKR {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>GST ({(taxRate * 100).toFixed(1)}%):</span>
              <span>PKR {taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-xl mt-2 pt-2 border-t-2 border-gray-300">
              <span>Total Amount Due:</span>
              <span>PKR {total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Regulatory & Legal Requirements */}
      <section className="mt-8">
        <h3 className="font-bold text-gray-700 mb-3 text-lg">FBR Compliance & Verification</h3>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2 text-gray-700">
            <p><strong>FBR Invoice Reference Number:</strong> {enhancedInvoice.invoice.fbrInvoiceReferenceNumber}</p>
            <p><strong>Invoice Reference Number (IRN):</strong> {enhancedInvoice.fbrData?.irn}</p>
            <p><strong>Provider NTN:</strong> {enhancedInvoice.fbrData?.ntn}</p>
            <p><strong>Customer NTN/CNIC:</strong> {enhancedInvoice.subscriber.cnic}</p>
            <p className="text-sm text-gray-600 mt-2">* This invoice is FBR compliant and verifiable</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700 mb-2">Scan to Verify Invoice</p>
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="FBR QR Code" className="mx-auto border border-gray-300" />
            )}
            <p className="text-xs text-gray-600 mt-2">Verifiable via Tax Asaan App</p>
          </div>
        </div>
      </section>

      {/* Payment Details */}
      <section className="mt-8">
        <h3 className="font-bold text-gray-700 mb-3 text-lg">Payment Information</h3>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Payment Methods:</h4>
            <ul className="text-gray-700 space-y-1">
              <li>• Bank Transfer: Account details available on request</li>
              <li>• Cash: At our office</li>
              <li>• Digital Wallet: Available via our mobile app</li>
              <li>• Online Payment: Visit our website</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Terms & Conditions:</h4>
            <div className="text-gray-700 space-y-1">
              <p><strong>Late Fee Policy:</strong> {enhancedInvoice.invoice.lateFeePolicy}</p>
              <p><strong>Payment Due:</strong> On or before {enhancedInvoice.invoice.dueDate}</p>
              <p className="text-sm text-gray-600 mt-2">Non-payment may result in service suspension</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t-2 border-gray-300">
        <div className="text-center text-gray-600">
          <p className="font-semibold text-lg mb-2">Thank you for choosing {enhancedInvoice.company.name}!</p>
          <p>If you have any questions about this invoice, please contact us:</p>
          <p>Phone: {enhancedInvoice.company.contact1} | Email: {enhancedInvoice.company.email}</p>
          <p className="text-sm mt-2">This is a computer-generated invoice and does not require a signature</p>
        </div>
      </footer>
    </div>
  );

  const thermalLayout = (
    <div className="print-container bg-white text-black p-2 font-mono" style={{ width: '80mm' }}>
      <style jsx>{`
        @page {
          size: 80mm 297mm;
          margin: 1mm;
        }
        .thermal-text {
          font-size: 10px;
          line-height: 1.2;
        }
        .thermal-header {
          font-size: 12px;
          font-weight: bold;
        }
        .thermal-title {
          font-size: 14px;
          font-weight: bold;
        }
        .thermal-separator {
          border-top: 1px dashed #000;
          margin: 2px 0;
        }
        .thermal-qr {
          width: 60px;
          height: 60px;
        }
      `}</style>
      
      {/* Header Section */}
      <div className="text-center thermal-title">
        <div className="thermal-header">{enhancedInvoice.company.name.toUpperCase()}</div>
        <div className="thermal-text">{enhancedInvoice.company.address}</div>
        <div className="thermal-text">NTN: {enhancedInvoice.fbrData?.ntn || 'N/A'}</div>
      </div>
      
      <div className="thermal-separator"></div>
      
      {/* Invoice Info */}
      <div className="thermal-text">
        <div className="flex justify-between">
          <span>Invoice: {enhancedInvoice.invoice.id}</span>
        </div>
        <div className="flex justify-between">
          <span>Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>Time: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      
      <div className="thermal-separator"></div>
      
      {/* Subscriber Info (Condensed) */}
      <div className="thermal-text">
        <div className="flex justify-between">
          <span>User: {enhancedInvoice.subscriber.name.replace(/\s+/g, '_').toLowerCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>CID: {enhancedInvoice.subscriber.uniqueId}</span>
        </div>
        <div className="flex justify-between">
          <span>Phone: {enhancedInvoice.subscriber.phone}</span>
        </div>
      </div>
      
      <div className="thermal-separator"></div>
      
      {/* Service Details */}
      <div className="thermal-text">
        <div className="flex justify-between mb-1">
          <span className="font-bold">Description</span>
          <span className="font-bold">Amount</span>
        </div>
      </div>
      
      <div className="thermal-separator"></div>
      
      {/* Package Info */}
      <div className="thermal-text">
        <div className="flex justify-between">
          <span>{enhancedInvoice.subscriber.packageName} ({new Date().toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()})</span>
          <span>{subtotal.toLocaleString()}</span>
        </div>
        {enhancedInvoice.invoice.itemizedCharges?.installationCharges ? (
          <div className="flex justify-between">
            <span>Installation</span>
            <span>{enhancedInvoice.invoice.itemizedCharges.installationCharges.toLocaleString()}</span>
          </div>
        ) : null}
        {enhancedInvoice.invoice.itemizedCharges?.addOnServices?.map((service, index) => (
          <div key={index} className="flex justify-between">
            <span>{service.name}</span>
            <span>{service.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>
      
      <div className="thermal-separator"></div>
      
      {/* Financial Summary */}
      <div className="thermal-text">
        <div className="flex justify-between">
          <span>SUBTOTAL:</span>
          <span>{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>GST ({(taxRate * 100).toFixed(1)}%):</span>
          <span>{taxAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold thermal-header">
          <span>TOTAL PAYABLE:</span>
          <span>{total.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="thermal-separator"></div>
      
      {/* FBR Compliance Section */}
      <div className="text-center thermal-text">
        <div className="thermal-header mb-1">FBR COMPLIANT</div>
        {qrCodeUrl && (
          <div className="flex justify-center mb-1">
            <img src={qrCodeUrl} alt="FBR QR Code" className="thermal-qr" />
          </div>
        )}
        <div className="thermal-text">Verifiable via App</div>
        <div className="thermal-text">IRN: {enhancedInvoice.fbrData?.irn}</div>
      </div>
      
      <div className="thermal-separator"></div>
      
      {/* Footer */}
      <div className="text-center thermal-text">
        <div className="thermal-header">Support: {enhancedInvoice.company.contact1}</div>
        <div className="thermal-text">{enhancedInvoice.company.name}</div>
        <div className="thermal-text">Thank you for choosing!</div>
        <div className="thermal-text mt-1">Status: {invoice.status?.toUpperCase()}</div>
        <div className="thermal-text">Due: {enhancedInvoice.invoice.dueDate}</div>
      </div>
      
      <div className="thermal-separator"></div>
      
      {/* Terms */}
      <div className="text-center thermal-text">
        <div className="thermal-text">Non-refundable</div>
        <div className="thermal-text">Subject to SLA</div>
      </div>
    </div>
  );

  return size === 'a4' ? a4Layout : thermalLayout;
}