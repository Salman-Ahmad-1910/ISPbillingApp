'use client';

import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import type { Company } from '@/lib/types';

interface AccountHead {
  id: string;
  masterAccount: string;
  accountType: string;
}

interface SubHead {
  id: string;
  subMasterAccount: string;
  masterAccountId: string;
  masterAccount: string;
  accountType: string;
}

interface TransactionType {
  id: string;
  paymentChannel: string;
  transaction: string;
}

interface AccountEntry {
  id: string;
  head: string;
  subHead: string;
  description: string;
  date: string;
  addBy: string;
  editBy: string;
  amount: number;
  transactionType: string;
}

interface AccountEntryPrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entry: AccountEntry | null;
  headsList: AccountHead[];
  subHeadsList: SubHead[];
  txnTypesList: TransactionType[];
}

export function AccountEntryPrintDialog({ isOpen, onClose, entry, headsList, subHeadsList, txnTypesList }: AccountEntryPrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { companyId } = useCompany();
  const { data: companiesData = [] } = useGenericQuery<Company>('admin/companies', companyId ?? undefined);
  const companies = companiesData || [];
  const company = companies.find(c => c.id === companyId);

  const logoUrl = company?.logo
    ? `${api?.defaults?.baseURL}/uploads/company_images/${company.id}`
    : null;

  const stampUrl = company?.stamp
    ? `${api?.defaults?.baseURL}/uploads/company_stamps/${company.id}`
    : null;

  const getHeadName = (headId: string) => headsList.find(h => h.id === headId)?.masterAccount || headId;
  const getHeadType = (headId: string) => headsList.find(h => h.id === headId)?.accountType || '';
  const getSubHeadName = (subHeadId: string) => subHeadsList.find(s => s.id === subHeadId)?.subMasterAccount || subHeadId;
  const getTxnTypeName = (txnTypeId: string) => txnTypesList.find(t => t.id === txnTypeId)?.paymentChannel || txnTypeId;

  useEffect(() => {
    if (!isOpen) return;
    const style = `
      @media print {
        body * { visibility: hidden; }
        .print-entry-area, .print-entry-area * { visibility: visible; }
        .print-entry-area { position: absolute !important; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
        body { margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { overflow: hidden !important; }
        @page { size: A4; margin: 15mm; }
        * { box-shadow: none !important; text-shadow: none !important; }
        table, th, td { border: 1px solid #d1d5db !important; }
      }
    `;
    const el = document.createElement('style');
    el.textContent = style;
    document.head.appendChild(el);
    return () => { if (document.head.contains(el)) document.head.removeChild(el); };
  }, [isOpen]);

  const handlePrint = () => {
    window.print();
  };

  if (!entry) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 gap-0">
        <div className="no-print sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Account Entry - Print Preview</h2>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={handlePrint}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Close
            </Button>
          </div>
        </div>

        <div ref={printRef} className="print-entry-area bg-white text-gray-900 p-8 font-sans max-w-4xl mx-auto">
          {/* Header */}
          <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900 mb-8">
            <div className="flex items-start gap-4">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company?.name || 'Company Name'}</h1>
                {company?.address && <p className="text-gray-600 text-sm mt-1">{company.address}</p>}
                {company?.contact1 && <p className="text-gray-600 text-sm">Phone: {company.contact1}</p>}
                {company?.email && <p className="text-gray-600 text-sm">Email: {company.email}</p>}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-extrabold tracking-wider text-violet-600">ACCOUNT ENTRY</h2>
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-gray-500">Entry ID: <span className="text-gray-900 font-semibold">{entry.id.slice(0, 8)}</span></p>
                <p className="text-gray-500">Date: <span className="text-gray-900 font-semibold">{entry.date}</span></p>
              </div>
            </div>
          </header>

          {/* Entry Details Table */}
          <table className="w-full text-left border-collapse text-sm mb-8">
            <thead>
              <tr className="bg-violet-600 text-white">
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider w-1/3">Field</th>
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-3 font-semibold text-gray-700">Account Head</td>
                <td className="border border-gray-300 p-3">{getHeadName(entry.head)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-semibold text-gray-700">Account Type</td>
                <td className="border border-gray-300 p-3">{getHeadType(entry.head)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-semibold text-gray-700">Sub Head</td>
                <td className="border border-gray-300 p-3">{getSubHeadName(entry.subHead)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-semibold text-gray-700">Description</td>
                <td className="border border-gray-300 p-3">{entry.description || '-'}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-semibold text-gray-700">Transaction Type</td>
                <td className="border border-gray-300 p-3">{getTxnTypeName(entry.transactionType)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-semibold text-gray-700">Amount (PKR)</td>
                <td className="border border-gray-300 p-3 text-lg font-bold text-emerald-600">{entry.amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-semibold text-gray-700">Created By</td>
                <td className="border border-gray-300 p-3">{entry.addBy}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-semibold text-gray-700">Last Edited By</td>
                <td className="border border-gray-300 p-3">{entry.editBy}</td>
              </tr>
            </tbody>
          </table>

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-gray-300">
            <div className="flex justify-between items-end">
              <div style={{ textAlign: 'center' }}>
                {stampUrl ? (
                  <img src={stampUrl} alt="Company Stamp"
                    style={{ maxHeight: '80px', maxWidth: '180px', objectFit: 'contain', marginBottom: '5px' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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
              <p className="text-sm mt-1">Phone: {company?.contact1} | Email: {company?.email}</p>
              <p className="text-xs text-gray-400 mt-2">This is a computer-generated document and does not require a signature</p>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
