'use client';

import { useMemo, useState } from 'react';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, ShoppingCart, DollarSign, Receipt } from 'lucide-react';
import { useCompany } from '@/context/company-context';

import { ClientPage } from './_components/client-page';

/** Normalises an invoice date (e.g. "2024-05-03", "2024-05-03T00:00:00Z") to "YYYY-MM-DD". */
function toDateKey(value?: string | null): string | null {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function VendorInvoicesPage() {
  const { companyId } = useCompany();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data: vendorInvoices = [], isLoading, error } = useGenericQuery<any>('inventory/vendor-invoices', companyId ?? undefined);

  // Invoices restricted to the selected buying-date range (inclusive).
  const filteredVendorInvoices = useMemo(() => {
    if (!Array.isArray(vendorInvoices)) return [];
    if (!fromDate && !toDate) return vendorInvoices;

    return vendorInvoices.filter((invoice: any) => {
      const key = toDateKey(invoice?.invoiceDate);
      if (!key) return false;
      if (fromDate && key < fromDate) return false;
      if (toDate && key > toDate) return false;
      return true;
    });
  }, [vendorInvoices, fromDate, toDate]);

  const totalSpent = useMemo(
    () => filteredVendorInvoices.reduce((sum: number, invoice: any) => sum + (Number(invoice.totalAmount) || 0), 0),
    [filteredVendorInvoices]
  );

  const handleClearDateFilter = () => {
    setFromDate('');
    setToDate('');
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading vendor invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Failed to load vendor invoices</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Invoice</h1>
          <p className="text-sm text-muted-foreground">Manage vendor invoices and track product purchases with serial numbers.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-orange-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold">{filteredVendorInvoices.length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold">PKR {totalSpent.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Avg Per Purchase</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                PKR {filteredVendorInvoices.length > 0
                  ? Math.round(totalSpent / filteredVendorInvoices.length).toLocaleString()
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ClientPage
        data={filteredVendorInvoices}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onClearDateFilter={handleClearDateFilter}
      />
    </div>
  );
}
