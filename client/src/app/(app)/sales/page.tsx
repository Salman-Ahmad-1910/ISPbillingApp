'use client';

import { Card, CardContent } from '@/components/ui/card';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
// OLD: import { useGenericQuery } from '@/hooks/api/use-generic-query';
import api from '@/lib/api';
import { Loader2, ShoppingCart, TrendingUp, DollarSign, Receipt } from 'lucide-react';

import { ClientPage, type SaleFilters } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import { useMemo, useState, useEffect } from 'react';

interface PagedSalesResponse {
  sales: any[];
  total: number;
  totalRevenue: number;
  page: number;
  pageSize: string;
}

export default function SalesPage() {
  const { companyId } = useCompany();
  const [filters, setFilters] = useState<SaleFilters>({
    fromDate: '',
    toDate: '',
    salesType: 'all',
    paymentType: 'all',
    serviceType: 'all',
    fiberPaymentStatus: 'all',
    search: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageSize, setPageSize] = useState<string>('10');
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 500);
    return () => clearTimeout(t);
  }, [filters.search]);

  // Filters sent to the backend. The search box only takes effect after the
  // debounce, so typing a character does not fire a request by itself.
  const filterParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (filters.fromDate) p.fromDate = filters.fromDate;
    if (filters.toDate) p.toDate = filters.toDate;
    if (filters.salesType && filters.salesType !== 'all') p.salesType = filters.salesType;
    if (filters.paymentType && filters.paymentType !== 'all') p.paymentType = filters.paymentType;
    if (filters.serviceType && filters.serviceType !== 'all') p.serviceType = filters.serviceType;
    if (filters.fiberPaymentStatus && filters.fiberPaymentStatus !== 'all') p.paymentStatus = filters.fiberPaymentStatus;
    if (debouncedSearch.trim()) p.search = debouncedSearch.trim();
    return p;
  }, [
    filters.fromDate,
    filters.toDate,
    filters.salesType,
    filters.paymentType,
    filters.serviceType,
    filters.fiberPaymentStatus,
    debouncedSearch,
  ]);

  // Back to page 1 whenever the effective filters or page size change.
  useEffect(() => {
    setCurrentPage(1);
  }, [filterParams, pageSize]);

  // OLD (before backend pagination) — kept for easy rollback. It loaded every
  // sale and unmounted the whole page behind the loader on each new search:
  // const { data: sales = [], isLoading } = useGenericQuery<any>(
  //   'pos/sales',
  //   companyId ?? undefined,
  //   Object.keys(params).length > 0 ? params : undefined,
  // );
  // const totalRevenue = useMemo(() => {
  //   if (!Array.isArray(sales)) return 0;
  //   return sales.reduce((sum: number, s: any) => sum + (Number(s.totalAmount) || 0), 0);
  // }, [sales]);
  // const totalTransactions = useMemo(() => {
  //   if (!Array.isArray(sales)) return 0;
  //   return sales.length;
  // }, [sales]);
  // if (isLoading) { return <full-page loader /> }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['pos/sales', companyId ?? undefined, { ...filterParams, page: currentPage, pageSize }],
    queryFn: async () => {
      const res = await api.get('/pos/sales', {
        params: { ...filterParams, page: currentPage, pageSize, companyId },
      });
      return (res.data?.data ?? { sales: [], total: 0, totalRevenue: 0 }) as PagedSalesResponse;
    },
    enabled: !!companyId,
    // Keep showing the current rows while the next page / search result loads,
    // instead of unmounting the whole page behind a loader.
    placeholderData: keepPreviousData,
  });

  const sales = Array.isArray(data?.sales) ? data!.sales : [];
  const totalTransactions = Number(data?.total) || 0;
  const totalRevenue = Number(data?.totalRevenue) || 0;

  // Full-page loader only on the very first load, never while searching.
  if (isLoading && !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">View and manage all point-of-sale transactions.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">PKR {totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold">{totalTransactions}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Avg Per Transaction</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                PKR {totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions).toLocaleString() : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          {/* OLD: <ClientPage data={sales} filters={filters} onFiltersChange={setFilters} /> */}
          <ClientPage
            data={sales}
            total={totalTransactions}
            isFetching={isFetching}
            exportParams={filterParams}
            filters={filters}
            onFiltersChange={setFilters}
            pageSize={pageSize}
            setPageSize={setPageSize}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
