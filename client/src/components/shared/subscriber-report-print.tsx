'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import api from '@/lib/api';
import { format } from 'date-fns';

export interface InvoiceAccent {
  title: string;
  border: string;
  headerBg: string;
  rowHover: string;
}

export interface InvoiceColumn<T> {
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T, index: number) => ReactNode;
}

interface SubscriberReportInvoiceProps<T> {
  title: string;
  subtitle?: string;
  accent: InvoiceAccent;
  data: T[];
  columns: InvoiceColumn<T>[];
  emptyMessage?: string;
  onBack: () => void;
}

export function SubscriberReportInvoice<T>({
  title,
  subtitle,
  accent,
  data,
  columns,
  emptyMessage = 'No records found.',
  onBack,
}: SubscriberReportInvoiceProps<T>) {
  const { companies, companyId } = useCompany();

  const company = useMemo(() => {
    return companies.find((c) => c.id === companyId) || null;
  }, [companies, companyId]);

  const logoUrl = company?.logo
    ? `${api?.defaults?.baseURL || ''}/uploads/company_images/${company.id}`
    : null;

  const stampUrl = company?.stamp
    ? `${api?.defaults?.baseURL || ''}/uploads/company_stamps/${company.id}`
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="print-area bg-white text-gray-900 rounded-xl border shadow-sm p-6 md:p-10">
        <div className="flex justify-between no-print mb-4">
          <Button variant="outline" size="sm" className="gap-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back to Report
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>

        <div className={`flex justify-between items-start pb-6 border-b-2 ${accent.border} mb-8`}>
          <div className="flex items-start gap-4">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Company Logo"
                className="w-14 h-14 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company?.name || 'Company Name'}</h1>
              <p className="text-gray-500 text-sm mt-1">{company?.address || ''}</p>
              {company?.email && <p className="text-gray-500 text-sm">Email: {company.email}</p>}
              {company?.contact1 && <p className="text-gray-500 text-sm">Phone: {company.contact1}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className={`text-3xl font-extrabold tracking-wider ${accent.title}`}>{title}</h2>
            {subtitle && <p className="text-gray-500 text-sm mt-2">{subtitle}</p>}
            <p className="text-gray-500 text-sm mt-1">Generated: {format(new Date(), 'dd MMM yyyy')}</p>
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className={accent.headerBg}>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="border border-gray-300 p-6 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index} className={accent.rowHover}>
                  {columns.map((col, i) => (
                    <td
                      key={i}
                      className={`border border-gray-300 p-3 ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                      }`}
                    >
                      {col.render(row, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-10 pt-6 border-t border-gray-300 flex justify-between items-end">
          <div className="text-center">
            {stampUrl ? (
              <img
                src={stampUrl}
                alt="Company Stamp"
                className="max-h-20 max-w-48 object-contain mb-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-48 border-b border-gray-900 mb-1"></div>
            )}
            <p className="text-xs text-gray-500">Company Stamp</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-b border-gray-900 mb-1"></div>
            <p className="text-xs text-gray-500">Authorized Signature</p>
          </div>
        </div>

        <div className="text-center text-gray-400 text-xs mt-6">
          <p className="font-semibold text-gray-900">{company?.name || 'Company Name'}</p>
          <p className="mt-1">Phone: {company?.contact1} | Email: {company?.email}</p>
          <p className="mt-2">This is a computer-generated report and does not require a signature</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute !important;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { size: A4 landscape; margin: 12mm; }
          table, th, td { border-color: #d1d5db !important; }
          th { color: white !important; }
        }
      `}</style>
    </div>
  );
}
