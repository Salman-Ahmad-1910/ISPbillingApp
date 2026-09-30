'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, UserRound } from 'lucide-react';
import { useMemo } from 'react';

import { SalesCustomerClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';

export default function SalesCustomersPage() {
  const { companyId } = useCompany();

  const { data: customers = [], isLoading } = useGenericQuery<any>('crm/customers', companyId ?? undefined);

  const totalCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return 0;
    return customers.length;
  }, [customers]);

  const activeCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return 0;
    return customers.filter((c: any) => c.status === 'active').length;
  }, [customers]);

  const totalOutstanding = useMemo(() => {
    if (!Array.isArray(customers)) return 0;
    return customers.reduce((sum: number, c: any) => sum + (Number(c.outstandingBalance) || 0), 0);
  }, [customers]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage customers who are not subscribers or dealers.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-violet-500/50 via-purple-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">{totalCustomers}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCustomers}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Outstanding (PKR)</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {totalOutstanding.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <SalesCustomerClientPage data={customers} />
        </CardContent>
      </Card>
    </div>
  );
}
