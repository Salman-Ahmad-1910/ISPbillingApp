'use client';

import { useMemo, useEffect } from 'react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Connection, Company } from '@/lib/types';
import api from '@/lib/api';

function getPackagePrice(c: Connection): number {
  const cable = Number(c.amount) || 0;
  const internet = Number(c.sameAmount) || 0;
  if (c.connectionType === 'tv_cable') return cable;
  if (c.connectionType === 'internet') return internet;
  return cable + internet;
}

export default function PrintAdvancePage() {
  const { companyId, companies } = useCompany();

  const { data: connectionsData, isLoading } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);

  const connections = connectionsData || [];
  const currentCompany = companies.find(c => c.id === companyId);

  const logoUrl = currentCompany?.logo
    ? `${api?.defaults?.baseURL}/uploads/company_images/${currentCompany.id}`
    : null;

  const stampUrl = currentCompany?.stamp
    ? `${api?.defaults?.baseURL}/uploads/company_stamps/${currentCompany.id}`
    : null;

  useEffect(() => {
    const printStyles = `
      @media print {
        body * { visibility: hidden; }
        .print-area, .print-area * { visibility: visible; }
        .print-area {
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
  }, []);

  const advanceSubscribers = useMemo(() => {
    return connections.filter(c => c.paymentStatus === 'advance');
  }, [connections]);

  const totalPackageFees = useMemo(() => {
    return advanceSubscribers.reduce((sum, c) => sum + getPackagePrice(c), 0);
  }, [advanceSubscribers]);

  const totalAdvanceAmount = useMemo(() => {
    return advanceSubscribers.reduce((sum, c) => sum + Math.abs(Number(c.remainingAmount) || 0), 0);
  }, [advanceSubscribers]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading advance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-root">
      <div className="no-print p-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Advance Subscribers - Print Preview</h1>
        <Button onClick={() => window.print()} className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-sm">
          <Printer className="mr-2 h-4 w-4" />
          Print Invoice
        </Button>
      </div>

      <div className="print-area bg-white text-gray-900 p-8 font-sans max-w-4xl mx-auto">
        <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900 mb-8">
          <div className="flex items-start gap-4">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentCompany?.name}</h1>
              <p className="text-gray-600 text-sm mt-1">{currentCompany?.address}</p>
              <p className="text-gray-600 text-sm">Phone: {currentCompany?.contact1}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-extrabold tracking-wider text-emerald-600">ADVANCE</h2>
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-gray-500">Date: <span className="text-gray-900 font-semibold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
              <p className="text-gray-500">Total Subscribers: <span className="text-gray-900 font-semibold">{advanceSubscribers.length}</span></p>
            </div>
          </div>
        </header>

        <section>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-emerald-600 text-white">
                <th className="border border-gray-300 p-3 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                <th className="border border-gray-300 p-3 text-left text-xs font-semibold uppercase tracking-wider">Subscriber</th>
                <th className="border border-gray-300 p-3 text-left text-xs font-semibold uppercase tracking-wider">ID</th>
                <th className="border border-gray-300 p-3 text-left text-xs font-semibold uppercase tracking-wider">Contact</th>
                <th className="border border-gray-300 p-3 text-left text-xs font-semibold uppercase tracking-wider">Address</th>
                <th className="border border-gray-300 p-3 text-right text-xs font-semibold uppercase tracking-wider">Package Fee</th>
                <th className="border border-gray-300 p-3 text-right text-xs font-semibold uppercase tracking-wider">Advance</th>
              </tr>
            </thead>
            <tbody>
              {advanceSubscribers.map((c, idx) => (
                <tr key={c.id} className="border border-gray-300 hover:bg-emerald-50/50">
                  <td className="border border-gray-300 p-3 text-center text-gray-500 font-medium">{idx + 1}</td>
                  <td className="border border-gray-300 p-3 font-medium">{c.name}</td>
                  <td className="border border-gray-300 p-3 font-mono text-xs">{c.internetId || c.id?.slice(0, 8) || '---'}</td>
                  <td className="border border-gray-300 p-3">{c.cell || c.mobile || '---'}</td>
                  <td className="border border-gray-300 p-3 text-xs max-w-[150px] truncate" title={c.address}>{c.address || '---'}</td>
                  <td className="border border-gray-300 p-3 text-right font-semibold">{getPackagePrice(c).toLocaleString()}</td>
                  <td className="border border-gray-300 p-3 text-right font-semibold text-blue-600">{Math.abs(Number(c.remainingAmount) || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border border-gray-300 font-bold">
                <td className="border border-gray-300 p-3" colSpan={5}>TOTAL</td>
                <td className="border border-gray-300 p-3 text-right text-lg">PKR {totalPackageFees.toLocaleString()}</td>
                <td className="border border-gray-300 p-3 text-right text-lg text-blue-600">PKR {totalAdvanceAmount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className="mt-6 flex justify-end">
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">Total Subscribers: <span className="font-bold text-gray-900">{advanceSubscribers.length}</span></p>
            <p className="text-sm text-gray-500">Total Advance: <span className="text-xl font-extrabold text-emerald-600">PKR {totalAdvanceAmount.toLocaleString()}</span></p>
          </div>
        </div>

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
            <p className="font-bold text-lg text-gray-900">{currentCompany?.name}</p>
            <p className="text-sm mt-1">Phone: {currentCompany?.contact1}</p>
            <p className="text-xs text-gray-400 mt-2">This is a computer-generated invoice and does not require a signature</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
