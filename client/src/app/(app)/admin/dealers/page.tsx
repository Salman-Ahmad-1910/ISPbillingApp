'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useMemo } from 'react';
import { Loader2, Users, Handshake, Wallet, Percent } from 'lucide-react';

export default function DealersPage() {
  const { companyId } = useCompany();

  const { data: dealers = [], isLoading } = useGenericQuery<any>('dealers', companyId ?? undefined);

  const totalDealers = useMemo(() => {
    if (!Array.isArray(dealers)) return 0;
    return dealers.length;
  }, [dealers]);

  const totalWalletBalance = useMemo(() => {
    if (!Array.isArray(dealers)) return 0;
    return dealers.reduce((sum: number, d: any) => sum + (Number(d.walletBalance) || 0), 0);
  }, [dealers]);

  if (!companyId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm">
            <Handshake className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dealers</h1>
            <p className="text-sm text-muted-foreground">Manage dealers for your company.</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Please select a company to manage dealers.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading dealers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm">
          <Handshake className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dealers</h1>
          <p className="text-sm text-muted-foreground">Manage dealers for your company.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-blue-500/50 via-cyan-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Dealers</p>
              <p className="text-2xl font-bold">{totalDealers}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Wallet Balance</p>
              <p className="text-2xl font-bold">PKR {totalWalletBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Avg Commission</p>
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                {totalDealers > 0
                  ? (dealers.reduce((sum: number, d: any) => sum + (Number(d.commissionRate) || 0), 0) / totalDealers).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <ClientPage />
        </CardContent>
      </Card>
    </div>
  );
}
