'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { ReceiptText, CircleDollarSign, Clock, AlertTriangle, FileClock } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import type { Invoice } from '@/lib/types';

import { ClientPage } from './_components/client-page';

export default function InvoicesPage() {
  const { companyId } = useCompany();

  const { data: invoices = [], isLoading } = useGenericQuery<Invoice>('billing/invoices', companyId ?? undefined);

  const kpiData = useMemo(() => [
    {
      label: 'Total Invoices',
      value: invoices.length,
      icon: ReceiptText,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Collected',
      value: `PKR ${invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0).toLocaleString()}`,
      icon: CircleDollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    {
      label: 'Pending',
      value: invoices.filter(i => i.status === 'pending').length,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    {
      label: 'Overdue',
      value: invoices.filter(i => i.status === 'overdue').length,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
    {
      label: 'Draft',
      value: invoices.filter(i => i.status === 'draft').length,
      icon: FileClock,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
  ], [invoices]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
          <ReceiptText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">Create and manage subscriber invoices.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />

      {isLoading && companyId ? (
        <div className="flex h-[50vh] items-center justify-center">
          <LoadingSpinner text="Loading invoices..." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {kpiData.map((metric) => (
              <div key={metric.label} className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                  <div className={`rounded-lg ${metric.bg} p-2.5 transition-all duration-300 group-hover:scale-110`}>
                    <metric.icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold">{metric.value}</p>
              </div>
            ))}
          </div>

          <Card className="transition-all duration-300 hover:shadow-md">
            <CardContent className="p-0">
              <ClientPage />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
