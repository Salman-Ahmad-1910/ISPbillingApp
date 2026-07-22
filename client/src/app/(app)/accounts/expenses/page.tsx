'use client';

import { Button } from '@/components/ui/button';
import { Download, Receipt, DollarSign, Layers, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useMemo } from 'react';
import type { Expense } from '@/lib/types';

export default function ExpensesPage() {
  const { companyId } = useCompany();

  const { data: expenses = [], isLoading: isLoadingExpenses } = useGenericQuery<Expense>('accounts/expenses', companyId ?? undefined);

  const totalAmount = useMemo(() => {
    if (!Array.isArray(expenses)) return 0;
    return expenses.reduce((sum: number, e: Expense) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const categoryCount = useMemo(() => {
    if (!Array.isArray(expenses)) return 0;
    return new Set(expenses.map((e: Expense) => e.category).filter(Boolean)).size;
  }, [expenses]);

  if (isLoadingExpenses) { return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>; }

  if (!companyId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-rose-500 to-red-600 p-2.5 text-white shadow-sm">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            <p className="text-sm text-muted-foreground">Record and manage business expenses.</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Please select a company to view expenses.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-rose-500 to-red-600 p-2.5 text-white shadow-sm">
          <Receipt className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Record and manage business expenses.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-rose-500/50 via-red-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-rose-500 to-red-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold">{Array.isArray(expenses) ? expenses.length : 0}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">PKR {totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{categoryCount}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <ClientPage data={expenses} />
        </CardContent>
      </Card>
    </div>
  );
}
