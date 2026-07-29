'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Printer, X } from 'lucide-react';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import type { Company } from '@/lib/types';

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

interface AccountHead { id: string; masterAccount: string; accountType: string; }
interface SubHead { id: string; subMasterAccount: string; masterAccountId: string; }
interface TransactionType { id: string; paymentChannel: string; }

interface OneDayBalancePrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entries: AccountEntry[];
  dateLabel: string;
  headsList: AccountHead[];
  subHeadsList: SubHead[];
  txnTypesList: TransactionType[];
}

export function OneDayBalancePrintDialog({ isOpen, onClose, entries, dateLabel, headsList, subHeadsList, txnTypesList }: OneDayBalancePrintDialogProps) {
  const { companyId } = useCompany();
  const { data: companiesData = [] } = useGenericQuery<Company>('admin/companies', companyId ?? undefined);
  const companies = companiesData || [];
  const company = companies.find(c => c.id === companyId);

  const logoUrl = company?.logo ? `${api?.defaults?.baseURL}/uploads/company_images/${company.id}` : null;
  const stampUrl = company?.stamp ? `${api?.defaults?.baseURL}/uploads/company_stamps/${company.id}` : null;

  const getHeadName = (headId: string) => headsList.find(h => h.id === headId)?.masterAccount || headId;
  const getHeadType = (headId: string) => headsList.find(h => h.id === headId)?.accountType || '';
  const getSubHeadName = (subHeadId: string) => subHeadsList.find(s => s.id === subHeadId)?.subMasterAccount || subHeadId;
  const getTxnTypeName = (txnTypeId: string) => txnTypesList.find(t => t.id === txnTypeId)?.paymentChannel || txnTypeId;

  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);

  const groupedByHead = entries.reduce<Record<string, { headName: string; entries: AccountEntry[]; total: number }>>((acc, e) => {
    const headName = getHeadName(e.head);
    if (!acc[e.head]) acc[e.head] = { headName, entries: [], total: 0 };
    acc[e.head].entries.push(e);
    acc[e.head].total += e.amount;
    return acc;
  }, {});

  const isSingle = entries.length === 1;
  const entry = isSingle ? entries[0] : null;

  const handlePrint = () => {
    const printContent = document.getElementById('od-print-area');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print</title>
          ${styles}
          <style>
            body { margin: 0; padding: 0; background: #fff; }
            @page { size: A4; margin: 15mm; }
            * { box-shadow: none !important; text-shadow: none !important; }
            table, th, td { border: 1px solid #d1d5db !important; }
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 gap-0">
        <div className="no-print sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{isSingle ? 'Account Entry - Print Preview' : 'OD Balance Sheet - Print Preview'}</h2>
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

        <div id="od-print-area" className="bg-white text-gray-900 p-8 font-sans max-w-4xl mx-auto">
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
              <h2 className="text-4xl font-extrabold tracking-wider text-teal-600">
                {isSingle ? 'ACCOUNT ENTRY' : 'OD BALANCE SHEET'}
              </h2>
              <div className="mt-3 space-y-1 text-sm">
                {isSingle && entry && (
                  <p className="text-gray-500">Entry ID: <span className="text-gray-900 font-semibold">{entry.id}</span></p>
                )}
                <p className="text-gray-500">Date: <span className="text-gray-900 font-semibold">{dateLabel}</span></p>
                <p className="text-gray-500">Entries: <span className="text-gray-900 font-semibold">{entries.length}</span></p>
              </div>
            </div>
          </header>

          {/* Single Entry View */}
          {isSingle && entry && (
            <table className="w-full text-left border-collapse text-sm mb-8">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider w-1/3">Field</th>
                  <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-gray-300 p-3 font-semibold text-gray-700">Account Head</td><td className="border border-gray-300 p-3">{getHeadName(entry.head)}</td></tr>
                <tr><td className="border border-gray-300 p-3 font-semibold text-gray-700">Account Type</td><td className="border border-gray-300 p-3">{getHeadType(entry.head)}</td></tr>
                <tr><td className="border border-gray-300 p-3 font-semibold text-gray-700">Sub Head</td><td className="border border-gray-300 p-3">{getSubHeadName(entry.subHead)}</td></tr>
                <tr><td className="border border-gray-300 p-3 font-semibold text-gray-700">Description</td><td className="border border-gray-300 p-3">{entry.description || '-'}</td></tr>
                <tr><td className="border border-gray-300 p-3 font-semibold text-gray-700">Transaction Type</td><td className="border border-gray-300 p-3">{getTxnTypeName(entry.transactionType)}</td></tr>
                <tr><td className="border border-gray-300 p-3 font-semibold text-gray-700">Amount (PKR)</td><td className="border border-gray-300 p-3 text-lg font-bold text-teal-600">{entry.amount.toLocaleString()}</td></tr>
                <tr><td className="border border-gray-300 p-3 font-semibold text-gray-700">Created By</td><td className="border border-gray-300 p-3">{entry.addBy}</td></tr>
              </tbody>
            </table>
          )}

          {/* Bulk Entries View - Grouped by Account Head */}
          {!isSingle && Object.values(groupedByHead).map((group, gIdx) => (
            <section key={gIdx} className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-3 bg-gray-100 px-3 py-2 rounded">{group.headName}</h3>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-teal-600 text-white">
                    <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">#</th>
                    <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">Date</th>
                    <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">Sub Head</th>
                    <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">Description</th>
                    <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">Type</th>
                    <th className="border border-gray-300 p-3 text-right text-xs font-semibold uppercase tracking-wider">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {group.entries.map((e, idx) => (
                    <tr key={e.id} className="hover:bg-teal-50/50">
                      <td className="border border-gray-300 p-3 text-center text-gray-500">{idx + 1}</td>
                      <td className="border border-gray-300 p-3">{e.date}</td>
                      <td className="border border-gray-300 p-3">{getSubHeadName(e.subHead)}</td>
                      <td className="border border-gray-300 p-3 max-w-[200px] truncate">{e.description || '-'}</td>
                      <td className="border border-gray-300 p-3">{getTxnTypeName(e.transactionType)}</td>
                      <td className="border border-gray-300 p-3 text-right font-semibold">{e.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td className="border border-gray-300 p-3" colSpan={5}>{group.headName} Subtotal</td>
                    <td className="border border-gray-300 p-3 text-right text-lg">PKR {group.total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </section>
          ))}

          {/* Grand Total */}
          {!isSingle && (
            <div className="mt-6 flex justify-end">
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Total Entries: <span className="font-bold text-gray-900">{entries.length}</span></p>
                <p className="text-sm text-gray-500">Grand Total: <span className="text-xl font-extrabold text-teal-600">PKR {totalAmount.toLocaleString()}</span></p>
              </div>
            </div>
          )}

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
