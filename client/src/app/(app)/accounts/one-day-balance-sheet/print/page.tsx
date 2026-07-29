'use client';

import { useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Company } from '@/lib/types';
import api from '@/lib/api';

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

export default function PrintOneDayBalancePage() {
  const searchParams = useSearchParams();
  const { companyId } = useCompany();

  const filterDate = searchParams.get('date') || '';
  const filterHead = searchParams.get('head') || 'All';
  const filterSubHead = searchParams.get('subHead') || 'All';

  const { data: apiEntries = [], isLoading } = useGenericQuery<any>('accounts/entries', companyId ?? undefined);
  const { data: apiHeads = [] } = useGenericQuery<any>('accounts/heads', companyId ?? undefined);
  const { data: apiSubHeads = [] } = useGenericQuery<any>('accounts/sub-heads', companyId ?? undefined);
  const { data: apiTxnTypes = [] } = useGenericQuery<any>('billing/transaction-types', companyId ?? undefined);
  const { data: companiesData = [] } = useGenericQuery<Company>('admin/companies', companyId ?? undefined);

  const headsList: AccountHead[] = useMemo(() => Array.isArray(apiHeads) ? apiHeads : [], [apiHeads]);
  const subHeadsList: SubHead[] = useMemo(() => Array.isArray(apiSubHeads) ? apiSubHeads : [], [apiSubHeads]);
  const txnTypesList: TransactionType[] = useMemo(() => Array.isArray(apiTxnTypes) ? apiTxnTypes : [], [apiTxnTypes]);
  const entriesList: AccountEntry[] = useMemo(() => Array.isArray(apiEntries) ? apiEntries : [], [apiEntries]);

  const company = (companiesData || []).find((c: any) => c.id === companyId);
  const logoUrl = company?.logo ? `${api?.defaults?.baseURL}/uploads/company_images/${company.id}` : null;
  const stampUrl = company?.stamp ? `${api?.defaults?.baseURL}/uploads/company_stamps/${company.id}` : null;

  const getHeadName = (headId: string) => headsList.find(h => h.id === headId)?.masterAccount || headId;
  const getSubHeadName = (subHeadId: string) => subHeadsList.find(s => s.id === subHeadId)?.subMasterAccount || subHeadId;
  const getTxnTypeName = (txnTypeId: string) => txnTypesList.find(t => t.id === txnTypeId)?.paymentChannel || txnTypeId;

  const filteredData = useMemo(() => {
    return entriesList.filter(e => {
      if (filterDate && e.date !== filterDate) return false;
      if (filterHead !== 'All' && e.head !== filterHead) return false;
      if (filterSubHead !== 'All' && e.subHead !== filterSubHead) return false;
      return true;
    });
  }, [entriesList, filterDate, filterHead, filterSubHead]);

  const totalAmount = filteredData.reduce((s, e) => s + e.amount, 0);

  const groupedByHead = useMemo(() => {
    return filteredData.reduce<Record<string, { headName: string; entries: AccountEntry[]; total: number }>>((acc, e) => {
      const headName = getHeadName(e.head);
      if (!acc[e.head]) acc[e.head] = { headName, entries: [], total: 0 };
      acc[e.head].entries.push(e);
      acc[e.head].total += e.amount;
      return acc;
    }, {});
  }, [filteredData, headsList]);

  const dateDisplay = filterDate
    ? new Date(filterDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-root">
      <div className="no-print p-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">OD Balance Sheet - Print Preview</h1>
        <Button onClick={() => window.print()} className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-sm">
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

      <div className="print-area bg-white text-gray-900 p-8 font-sans max-w-4xl mx-auto">
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
            <h2 className="text-4xl font-extrabold tracking-wider text-teal-600">OD BALANCE SHEET</h2>
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-gray-500">Date: <span className="text-gray-900 font-semibold">{dateDisplay}</span></p>
              <p className="text-gray-500">Entries: <span className="text-gray-900 font-semibold">{filteredData.length}</span></p>
            </div>
          </div>
        </header>

        {filteredData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No entries found.</p>
          </div>
        ) : (
          <>
            {Object.values(groupedByHead).map((group, gIdx) => (
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

            <div className="mt-6 flex justify-end">
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Total Entries: <span className="font-bold text-gray-900">{filteredData.length}</span></p>
                <p className="text-sm text-gray-500">Grand Total: <span className="text-xl font-extrabold text-teal-600">PKR {totalAmount.toLocaleString()}</span></p>
              </div>
            </div>
          </>
        )}

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
            <p className="text-sm mt-1">Phone: {company?.contact1} | Email: {company?.email}</p>
            <p className="text-xs text-gray-400 mt-2">This is a computer-generated document and does not require a signature</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
