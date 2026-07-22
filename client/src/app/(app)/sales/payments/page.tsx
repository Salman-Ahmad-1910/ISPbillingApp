'use client';
import { Card, CardContent } from '@/components/ui/card';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import { usePayments } from '@/hooks/api/use-payments';
import { Loader2, Banknote, Wallet, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

export default function PaymentsPage() {
  const { companyId } = useCompany();
  const { data: payments = [], isLoading, error } = usePayments(companyId ?? undefined);

  const totalCollected = useMemo(() => {
    if (!Array.isArray(payments)) return 0;
    return payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const totalPayments = useMemo(() => {
    if (!Array.isArray(payments)) return 0;
    return payments.length;
  }, [payments]);

  const completedPayments = useMemo(() => {
    if (!Array.isArray(payments)) return 0;
    return payments.filter((p: any) => p.status === 'completed' || p.status === 'Completed').length;
  }, [payments]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading payments...</p>
        </div>
      </div>
    );
  }

  console.log('payments: ', payments)

  if (error) {
    return <div className="p-4 text-red-500">Failed to load payments</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payments / Recoveries</h1>
            <p className="text-sm text-muted-foreground">Record and track customer payments and installment recoveries.</p>
          </div>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-teal-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold">PKR {totalCollected.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold">{totalPayments}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedPayments}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <ClientPage data={payments} />
        </CardContent>
      </Card>
    </div>
  );
}
