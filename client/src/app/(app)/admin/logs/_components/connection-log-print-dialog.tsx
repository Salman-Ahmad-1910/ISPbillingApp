'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Printer, X } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import api from '@/lib/api';
import { format } from 'date-fns';
import type { ConnectionLog } from '@/lib/types';

const TYPE_LABELS: Record<string, string> = {
  both: 'Both',
  internet: 'Internet',
  tv_cable: 'TV Cable',
};

interface ConnectionLogPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: ConnectionLog[];
  fromDate?: Date;
  toDate?: Date;
}

export function ConnectionLogPrintDialog({ open, onOpenChange, logs, fromDate, toDate }: ConnectionLogPrintDialogProps) {
  const { companies, companyId } = useCompany();

  const company = companies.find((c) => c.id === companyId) || null;

  const logoUrl = company?.logo
    ? `${api?.defaults?.baseURL || ''}/uploads/company_images/${company.id}`
    : null;

  const stampUrl = company?.stamp
    ? `${api?.defaults?.baseURL || ''}/uploads/company_stamps/${company.id}`
    : null;

  useEffect(() => {
    if (!open) return;
    const printStyles = `
      @media print {
        body * { visibility: hidden; }
        .print-logs-container, .print-logs-container * { visibility: visible; }
        .print-logs-container {
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
        @page { size: A4 landscape; margin: 12mm; }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1400px] max-h-[95vh] overflow-y-auto p-0 gap-0">
        <div className="no-print sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Update Connection Log - Print Preview</h2>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Close
            </Button>
          </div>
        </div>

        <div className="print-logs-container bg-white text-gray-900 p-8 font-sans">
          <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900 mb-8">
            <div className="flex items-start gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company?.name || 'Company Name'}</h1>
                {company?.address && <p className="text-gray-600 text-sm mt-1">{company.address}</p>}
                {company?.contact1 && <p className="text-gray-600 text-sm">Phone: {company.contact1}</p>}
                {company?.email && <p className="text-gray-600 text-sm">Email: {company.email}</p>}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-extrabold tracking-wider text-amber-600">UPDATE CONNECTION LOG</h2>
              <div className="mt-3 space-y-1 text-sm">
                {fromDate && (
                  <p className="text-gray-500">
                    From: <span className="text-gray-900 font-semibold">{format(fromDate, 'dd MMM yyyy')}</span>
                  </p>
                )}
                {toDate && (
                  <p className="text-gray-500">
                    To: <span className="text-gray-900 font-semibold">{format(toDate, 'dd MMM yyyy')}</span>
                  </p>
                )}
                <p className="text-gray-500">
                  Generated: <span className="text-gray-900 font-semibold">{new Date().toLocaleDateString()}</span>
                </p>
                <p className="text-gray-500">
                  Records: <span className="text-gray-900 font-semibold">{logs.length}</span>
                </p>
              </div>
            </div>
          </header>

          <table className="w-full text-left border-collapse text-sm mb-8">
            <thead>
              <tr className="bg-amber-600 text-white">
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">#</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">Date</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">Time</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">Subscriber ID</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">Subscriber Name</th>
                <th className="border border-gray-300 p-2 text-center text-xs font-semibold uppercase tracking-wider">Type</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">Action</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">Previous Value</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">New Value</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">Updated By</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">Reason</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="border border-gray-300 p-4 text-center text-gray-500">
                    No connection changes found for the selected period.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-amber-50/50">
                    <td className="border border-gray-300 p-2">{index + 1}</td>
                    <td className="border border-gray-300 p-2 whitespace-nowrap">{log.logDate || '—'}</td>
                    <td className="border border-gray-300 p-2 whitespace-nowrap">{log.logTime || '—'}</td>
                    <td className="border border-gray-300 p-2 whitespace-nowrap font-mono text-xs">{log.internetId || '—'}</td>
                    <td className="border border-gray-300 p-2 font-semibold">{log.subscriberName || '—'}</td>
                    <td className="border border-gray-300 p-2 text-center">{TYPE_LABELS[log.connectionType || ''] || log.connectionType || '—'}</td>
                    <td className="border border-gray-300 p-2">{log.actionType || '—'}</td>
                    <td className="border border-gray-300 p-2 text-gray-600">{log.oldValue || '—'}</td>
                    <td className="border border-gray-300 p-2 text-gray-600">{log.newValue || '—'}</td>
                    <td className="border border-gray-300 p-2 whitespace-nowrap">{log.updatedByName || '—'}</td>
                    <td className="border border-gray-300 p-2">{log.reason || '—'}</td>
                    <td className="border border-gray-300 p-2">{log.remarks || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
            {logs.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={11} className="border border-gray-300 p-2 text-right uppercase text-xs">
                    Total Changes
                  </td>
                  <td className="border border-gray-300 p-2 text-center">{logs.length}</td>
                </tr>
              </tfoot>
            )}
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
              <p className="font-bold text-lg text-gray-900">{company?.name}</p>
              {company?.contact1 && (
                <p className="text-sm mt-1">
                  Phone: {company.contact1}
                  {company?.email ? ` | Email: ${company.email}` : ''}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">Generated on {new Date().toLocaleString()}</p>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
