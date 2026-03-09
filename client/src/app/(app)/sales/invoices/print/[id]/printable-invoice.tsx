'use client';

import type { Invoice, Company, Subscriber } from '@/lib/types';
import Image from 'next/image';
import { useEffect } from 'react';

interface PrintableInvoiceProps {
  invoice: Invoice;
  company: Company;
  subscriber: Subscriber;
  size: 'a4' | 'thermal';
}

export function PrintableInvoice({ invoice, company, subscriber, size }: PrintableInvoiceProps) {
  const items = [
    { name: subscriber.packageName, quantity: 1, price: invoice.amount, total: invoice.amount }
  ];
  const subtotal = invoice.amount;
  const tax = 0;
  const total = invoice.amount;

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
      <header className="flex justify-between items-start pb-8 border-b-2 border-gray-200">
        <div className="w-2/3">
          <h1 className="text-3xl font-bold text-gray-800">{company.name}</h1>
          <p className="text-gray-500">{company.address}</p>
          <p className="text-gray-500">{company.email} | {company.contact1}</p>
        </div>
        <div className="w-1/3 text-right">
          <h2 className="text-4xl font-bold uppercase text-gray-400">Invoice</h2>
          <p className="text-gray-600 mt-2"><strong>Invoice #:</strong> {invoice.id}</p>
          <p className="text-gray-600"><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
          <p className="text-gray-600"><strong>Due Date:</strong> {invoice.dueDate}</p>
        </div>
      </header>

      <section className="mt-8">
        <h3 className="font-bold text-gray-600 mb-2">Bill To:</h3>
        <p className="font-bold text-gray-800">{subscriber.name}</p>
        <p className="text-gray-500">{subscriber.installationAddress}</p>
        <p className="text-gray-500">{subscriber.phone}</p>
      </section>

      <section className="mt-8">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
            <tr>
              <th className="p-3">Description</th>
              <th className="p-3 text-right">Quantity</th>
              <th className="p-3 text-right">Unit Price</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="p-3">{item.name}</td>
                <td className="p-3 text-right">{item.quantity}</td>
                <td className="p-3 text-right">PKR {item.price.toLocaleString()}</td>
                <td className="p-3 text-right">PKR {item.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex justify-end mt-8">
        <div className="w-1/3">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>PKR {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax (0%)</span>
            <span>PKR 0</span>
          </div>
          <div className="flex justify-between font-bold text-xl mt-2 pt-2 border-t-2 border-gray-200 text-gray-800">
            <span>Total</span>
            <span>PKR {total.toLocaleString()}</span>
          </div>
        </div>
      </section>

      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>Thank you for your business!</p>
        <p>If you have any questions, please contact us at {company.email}</p>
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
      `}</style>
        <div className="text-center">
            <h1 className="font-bold text-lg">{company.name}</h1>
            <p className="text-xs">{company.address}</p>
            <p className="text-xs">Ph: {company.contact1}</p>
        </div>
        <hr className="my-2 border-dashed border-black"/>
        <div className="text-xs">
            <p><strong>Invoice #:</strong> {invoice.id}</p>
            <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Due:</strong> {invoice.dueDate}</p>
            <hr className="my-1 border-dashed border-black"/>
            <p><strong>To:</strong> {subscriber.name}</p>
            <p>{subscriber.installationAddress}</p>
        </div>
        <hr className="my-2 border-dashed border-black"/>
        <table className="w-full text-xs">
            <thead>
                <tr>
                    <th className="text-left">Item</th>
                    <th className="text-right">Price</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="text-left">{subscriber.packageName}</td>
                    <td className="text-right">PKR {invoice.amount.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>
        <hr className="my-2 border-dashed border-black"/>
        <div className="text-right text-xs">
            <p>Subtotal: PKR {subtotal.toLocaleString()}</p>
            <p>Tax: PKR 0</p>
            <p className="font-bold text-sm">Total: PKR {total.toLocaleString()}</p>
        </div>
        <hr className="my-2 border-dashed border-black"/>
        <div className="text-center text-xs mt-4">
            <p>Thank you for your business!</p>
            <p>Payment can be made via Cash, Bank or Online</p>
        </div>
    </div>
  );

  return size === 'a4' ? a4Layout : thermalLayout;
}
