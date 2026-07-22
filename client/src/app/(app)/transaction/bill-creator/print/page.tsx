'use client';

import { useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Connection, Area, Company } from '@/lib/types';
import api from '@/lib/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthYear(dateStr?: string): { month: string; year: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return { month: MONTHS[d.getMonth()], year: String(d.getFullYear()) };
}

function getCurrentMonthYear(): { month: string; year: string } {
  const now = new Date();
  return { month: MONTHS[now.getMonth()], year: String(now.getFullYear()) };
}

export default function PrintBillPage() {
  const searchParams = useSearchParams();
  const { companyId } = useCompany();

  const filterMonth = searchParams.get('month') || 'all';
  const filterYear = searchParams.get('year') || 'all';
  const filterBillType = searchParams.get('billType') || 'all';
  const filterSublocality = searchParams.get('sublocality') || 'all';

  const { data: connectionsData, isLoading } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);
  const { data: areasData } = useGenericQuery<Area>('network/areas', companyId ?? undefined);
  const { data: companiesData } = useGenericQuery<Company>('companies', companyId ?? undefined);

  const connections = connectionsData || [];
  const areas = areasData || [];
  const companies = companiesData || [];

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

  const billRows = useMemo(() => {
    const groups: Record<string, { amount: number; subscribers: number; connectionType: string; sublocality: string }> = {};

    const selectedMonth = filterMonth === 'all' ? getCurrentMonthYear().month : filterMonth;
    const selectedYear = filterYear === 'all' ? getCurrentMonthYear().year : filterYear;
    const isDefaultView = filterSublocality === 'all' && filterBillType === 'all';

    connections.forEach(c => {
      if (filterSublocality !== 'all' && c.sublocalityId !== filterSublocality) return;

      let typeLabel: string;
      if (c.connectionType === 'tv_cable') {
        typeLabel = 'Cable';
      } else if (c.connectionType === 'internet') {
        typeLabel = 'Internet';
      } else {
        typeLabel = 'Both';
      }

      if (filterBillType !== 'all') {
        const typeMap: Record<string, string> = { internet: 'Internet', tv_cable: 'Cable', both: 'Both' };
        if (typeLabel !== typeMap[filterBillType]) return;
      }

      const subName = areas.find(a => a.id === c.sublocalityId)?.subLocality || areas.find(a => a.id === c.sublocalityId)?.locality || 'Unknown';

      let groupKey: string;
      if (isDefaultView) {
        groupKey = typeLabel;
      } else if (filterSublocality === 'all') {
        groupKey = `${selectedMonth}_${selectedYear}_${typeLabel}`;
      } else {
        groupKey = `${selectedMonth}_${selectedYear}_${typeLabel}_${c.sublocalityId || 'all'}`;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { amount: 0, subscribers: 0, connectionType: typeLabel, sublocality: isDefaultView ? 'All' : subName };
      }

      if (c.connectionType === 'tv_cable') {
        groups[groupKey].amount += c.amount || 0;
      } else if (c.connectionType === 'internet') {
        groups[groupKey].amount += c.sameAmount || 0;
      } else {
        groups[groupKey].amount += (c.amount || 0) + (c.sameAmount || 0);
      }
      groups[groupKey].subscribers += 1;
    });

    return Object.entries(groups).map(([key, group], idx) => ({
      id: `BC-${String(idx + 1).padStart(4, '0')}`,
      month: selectedMonth,
      year: selectedYear,
      amount: group.amount,
      subscribers: group.subscribers,
      connectionType: group.connectionType,
      sublocality: group.sublocality,
    }));
  }, [connections, areas, filterMonth, filterYear, filterBillType, filterSublocality]);

  const totalAmount = billRows.reduce((sum, r) => sum + r.amount, 0);
  const totalSubscribers = billRows.reduce((sum, r) => sum + r.subscribers, 0);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading bill data...</p>
        </div>
      </div>
    );
  }

  const connTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      'Internet': 'bg-blue-100 text-blue-700 border-blue-200',
      'Cable': 'bg-orange-100 text-orange-700 border-orange-200',
      'Both': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
    return styles[type] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="print-root">
      <div className="no-print p-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Bill Creator - Print Preview</h1>
        <Button onClick={() => window.print()} className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-sm">
          <Printer className="mr-2 h-4 w-4" />
          Print Bill
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
              <p className="text-gray-600 text-sm">Email: {currentCompany?.email}</p>
              <p className="text-gray-600 text-sm">Phone: {currentCompany?.contact1}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-extrabold tracking-wider text-emerald-600">BILL</h2>
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-gray-500">Date: <span className="text-gray-900 font-semibold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
              <p className="text-gray-500">Period: <span className="text-gray-900 font-semibold">{filterMonth !== 'all' ? filterMonth : 'All'} {filterYear !== 'all' ? filterYear : ''}</span></p>
              <p className="text-gray-500">Type: <span className="text-gray-900 font-semibold">{filterBillType !== 'all' ? filterBillType.charAt(0).toUpperCase() + filterBillType.slice(1) : 'All'}</span></p>
              {filterSublocality !== 'all' && (
                <p className="text-gray-500">Area: <span className="text-gray-900 font-semibold">{areas.find(a => a.id === filterSublocality)?.subLocality || areas.find(a => a.id === filterSublocality)?.locality || filterSublocality}</span></p>
              )}
            </div>
          </div>
        </header>

        <section>
          <table className="bill-table w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-emerald-600 text-white">
                <th className="border border-gray-300 p-3 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                <th className="border border-gray-300 p-3 text-left text-xs font-semibold uppercase tracking-wider">Month</th>
                <th className="border border-gray-300 p-3 text-left text-xs font-semibold uppercase tracking-wider">Year</th>
                <th className="border border-gray-300 p-3 text-right text-xs font-semibold uppercase tracking-wider">Amount (PKR)</th>
                <th className="border border-gray-300 p-3 text-center text-xs font-semibold uppercase tracking-wider">Subscribers</th>
                <th className="border border-gray-300 p-3 text-center text-xs font-semibold uppercase tracking-wider">Type</th>
                <th className="border border-gray-300 p-3 text-left text-xs font-semibold uppercase tracking-wider">Sublocality</th>
              </tr>
            </thead>
            <tbody>
              {billRows.map((row, idx) => (
                <tr key={idx} className="border border-gray-300 hover:bg-emerald-50/50">
                  <td className="border border-gray-300 p-3 text-center text-gray-500 font-medium">{idx + 1}</td>
                  <td className="border border-gray-300 p-3 font-medium">{row.month}</td>
                  <td className="border border-gray-300 p-3">{row.year}</td>
                  <td className="border border-gray-300 p-3 text-right font-semibold">{row.amount.toLocaleString()}</td>
                  <td className="border border-gray-300 p-3 text-center font-semibold">{row.subscribers}</td>
                  <td className="border border-gray-300 p-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${connTypeBadge(row.connectionType)}`}>
                      {row.connectionType}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-3">{row.sublocality}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border border-gray-300 font-bold">
                <td className="border border-gray-300 p-3" colSpan={3}>TOTAL</td>
                <td className="border border-gray-300 p-3 text-right text-lg">PKR {totalAmount.toLocaleString()}</td>
                <td className="border border-gray-300 p-3 text-center text-lg">{totalSubscribers}</td>
                <td className="border border-gray-300 p-3" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className="mt-6 flex justify-end">
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">Total Subscribers: <span className="font-bold text-gray-900">{totalSubscribers}</span></p>
            <p className="text-sm text-gray-500">Total Amount: <span className="text-xl font-extrabold text-emerald-600">PKR {totalAmount.toLocaleString()}</span></p>
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
            <p className="text-sm mt-1">Phone: {currentCompany?.contact1} | Email: {currentCompany?.email}</p>
            <p className="text-xs text-gray-400 mt-2">This is a computer-generated bill and does not require a signature</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
