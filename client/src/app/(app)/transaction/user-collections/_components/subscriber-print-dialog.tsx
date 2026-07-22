'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, FileText, Smartphone } from 'lucide-react';
import type { Payment, Company } from '@/lib/types';
import api from '@/lib/api';

interface SubscriberPrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  company: Company | undefined;
  subscriberName?: string;
  collectorName?: string;
  initialTab?: 'a4' | 'thermal';
}

export function SubscriberPrintDialog({ isOpen, onClose, payment, company, subscriberName, collectorName, initialTab = 'a4' }: SubscriberPrintDialogProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  if (!payment) return null;

  const logoUrl = company?.logo
    ? `${api?.defaults?.baseURL}/uploads/company_images/${company.id}`
    : null;

  const stampUrl = company?.stamp
    ? `${api?.defaults?.baseURL}/uploads/company_stamps/${company.id}`
    : null;

  const handlePrint = (elementId: string, format: 'a4' | 'thermal') => {
    const printContent = document.getElementById(elementId);
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    const pageStyle = format === 'thermal'
      ? `@page { size: 80mm auto; margin: 3mm; } body { width: 80mm; }`
      : `@page { size: A4; margin: 15mm; }`;

    const contentHTML = format === 'thermal'
      ? `<div style="width:80mm; padding:4mm; font-family:monospace; font-size:11px; margin:0 auto;">${printContent.innerHTML}</div>`
      : printContent.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print</title>
          ${styles}
          <style>
            body { margin: 0; padding: 0; background: #fff; }
            ${pageStyle}
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${contentHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-xl shadow-lg p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-sm">
              <FileText className="h-4 w-4" />
            </div>
            Payment Receipt
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-0 mx-0 rounded-none border-b">
            <TabsTrigger value="a4" className="flex items-center gap-2 rounded-none">
              <FileText className="h-4 w-4" />
              A4 Invoice
            </TabsTrigger>
            <TabsTrigger value="thermal" className="flex items-center gap-2 rounded-none">
              <Smartphone className="h-4 w-4" />
              Thermal Receipt
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[calc(90vh-10rem)]">
            <TabsContent value="a4" className="m-0">
              <A4Invoice payment={payment} company={company} logoUrl={logoUrl} stampUrl={stampUrl} subscriberName={subscriberName} collectorName={collectorName} onPrint={() => handlePrint('print-a4', 'a4')} />
            </TabsContent>

            <TabsContent value="thermal" className="m-0">
              <ThermalInvoice payment={payment} company={company} logoUrl={logoUrl} subscriberName={subscriberName} collectorName={collectorName} onPrint={() => handlePrint('print-thermal', 'thermal')} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function A4Invoice({ payment, company, logoUrl, stampUrl, subscriberName, collectorName, onPrint }: { payment: Payment; company: Company | undefined; logoUrl: string | null; stampUrl: string | null; subscriberName?: string; collectorName?: string; onPrint: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end no-print">
        <Button onClick={onPrint} className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 shadow-sm">
          <Printer className="mr-2 h-4 w-4" />
          Print A4
        </Button>
      </div>

      <div className="print-area bg-white text-gray-900 p-8 font-sans max-w-4xl mx-auto" id="print-a4">

        <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900 mb-8">
          <div className="flex items-start gap-4">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company?.name || 'Company Name'}</h1>
              <p className="text-gray-600 text-sm mt-1">{company?.address}</p>
              {company?.email && <p className="text-gray-600 text-sm">Email: {company.email}</p>}
              {company?.contact1 && <p className="text-gray-600 text-sm">Phone: {company.contact1}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-extrabold tracking-wider text-blue-600">RECEIPT</h2>
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-gray-500">Bill ID: <span className="text-gray-900 font-semibold font-mono">{payment.id.slice(0, 8).toUpperCase()}</span></p>
              <p className="text-gray-500">Date: <span className="text-gray-900 font-semibold">{payment.paymentDate}</span></p>
              <p className="text-gray-500">Status:
                <span className="ml-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">PAID</span>
              </p>
            </div>
          </div>
        </header>

        <div className="mb-8">
          <h3 className="font-bold text-gray-700 mb-2 text-sm uppercase tracking-wider">Subscriber Information</h3>
          <div className="text-sm text-gray-700">
            <p className="font-semibold">{subscriberName || payment.subscriberName}</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-sm mb-8">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">Description</th>
              <th className="border border-gray-300 p-3 text-right text-xs font-semibold uppercase tracking-wider">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-blue-50/50">
              <td className="border border-gray-300 p-3 font-medium">Payment Method</td>
              <td className="border border-gray-300 p-3 text-right font-semibold capitalize">{payment.method || 'Cash'}</td>
            </tr>
            <tr className="hover:bg-blue-50/50">
              <td className="border border-gray-300 p-3 font-medium">Payment Month</td>
              <td className="border border-gray-300 p-3 text-right font-semibold">
                {new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </td>
            </tr>
            <tr className="hover:bg-blue-50/50">
              <td className="border border-gray-300 p-3 font-medium">Received By</td>
              <td className="border border-gray-300 p-3 text-right font-semibold">{collectorName || payment.collectorId?.slice(0, 8) || '---'}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td className="border border-gray-300 p-3">AMOUNT RECEIVED</td>
              <td className="border border-gray-300 p-3 text-right text-lg text-blue-600">PKR {payment.amount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

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
              <p className="text-xs text-gray-500">Authorized Signature</p>
            </div>
          </div>
          <div className="text-center text-gray-600 mt-6">
            <p className="font-bold text-lg text-gray-900">{company?.name || 'Company Name'}</p>
            <p className="text-sm mt-1">Phone: {company?.contact1} | Email: {company?.email}</p>
            <p className="text-xs text-gray-400 mt-2">This is a computer-generated receipt and does not require a signature</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ThermalInvoice({ payment, company, logoUrl, subscriberName, collectorName, onPrint }: { payment: Payment; company: Company | undefined; logoUrl: string | null; subscriberName?: string; collectorName?: string; onPrint: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end no-print">
        <Button onClick={onPrint} className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 shadow-sm">
          <Printer className="mr-2 h-4 w-4" />
          Print Thermal
        </Button>
      </div>

      <div className="flex justify-center">
        <div className="print-area bg-white border rounded-lg p-4 w-[300px] font-mono text-xs" id="print-thermal">

          <div className="text-center mb-3 pb-2 border-b border-dashed border-gray-400">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', margin: '0 auto 8px' }} />
            )}
            <p className="font-bold text-sm">{company?.name || 'Company'}</p>
            <p className="text-[10px] text-gray-500">{company?.address}</p>
            {company?.contact1 && <p className="text-[10px] text-gray-500">{company.contact1}</p>}
          </div>

          <div className="mb-3 pb-2 border-b border-dashed border-gray-400">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Bill ID:</span>
              <span className="font-bold">{payment.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Date:</span>
              <span className="font-bold">{payment.paymentDate}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Month:</span>
              <span className="font-bold">
                {new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="mb-3 pb-2 border-b border-dashed border-gray-400">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Subscriber:</span>
              <span className="font-bold">{subscriberName || payment.subscriberName}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Method:</span>
              <span className="font-bold capitalize">{payment.method || 'Cash'}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Received By:</span>
              <span className="font-bold">{collectorName || payment.collectorId?.slice(0, 8) || '---'}</span>
            </div>
          </div>

          <div className="mb-3 pb-2 border-b border-dashed border-gray-400">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Amount:</span>
              <span className="font-bold">PKR {payment.amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-center border-t border-dashed border-gray-400 pt-2">
            <p className="font-bold text-[10px]">{company?.name || 'Company'}</p>
            <p className="text-[9px] text-gray-500">Computer generated receipt</p>
          </div>
        </div>
      </div>
    </div>
  );
}
