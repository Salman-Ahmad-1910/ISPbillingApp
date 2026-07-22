'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, BookOpen, Wallet, Landmark, DollarSign } from 'lucide-react';

import { LedgerView } from './_components/ledger-view';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

import type { LedgerEntry } from '@/lib/types';

export default function CashBankLedgerPage() {
  const { companyId } = useCompany();

  const { data: cashLedger = [], isLoading: isLoadingCash, error: cashError } = useGenericQuery<LedgerEntry>('accounts/ledger?accountType=cash', companyId ?? undefined);
  const { data: bankLedger = [], isLoading: isLoadingBank, error: bankError } = useGenericQuery<LedgerEntry>('accounts/ledger?accountType=bank', companyId ?? undefined);

  const cashBalance = useMemo(() => {
    let bal = 0;
    (cashLedger || []).forEach((e: any) => { bal += (e.debit || 0) - (e.credit || 0); });
    return bal;
  }, [cashLedger]);

  const bankBalance = useMemo(() => {
    let bal = 0;
    (bankLedger || []).forEach((e: any) => { bal += (e.debit || 0) - (e.credit || 0); });
    return bal;
  }, [bankLedger]);

  if ((isLoadingCash && cashLedger.length === 0) || (isLoadingBank && bankLedger.length === 0)) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (cashError || bankError) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-lg font-medium text-red-600 mb-2">Error Loading Ledger Data</h3>
        <p className="text-muted-foreground">There was an error loading the ledger data. Please try again later.</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cash / Bank Ledger</h1>
          <p className="text-sm text-muted-foreground">Track all cash and bank transactions for your company.</p>
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
              <p className="text-xs font-medium text-muted-foreground">Cash Balance</p>
              <p className="text-2xl font-bold">PKR {cashBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Bank Balance</p>
              <p className="text-2xl font-bold">PKR {bankBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Entries</p>
              <p className="text-2xl font-bold">{(cashLedger?.length || 0) + (bankLedger?.length || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <Tabs defaultValue="cash">
            <div className="p-4 border-b">
              <TabsList>
                <TabsTrigger value="cash">Cash Ledger</TabsTrigger>
                <TabsTrigger value="bank">Bank Ledger</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="cash" className="m-0">
              <LedgerView initialData={cashLedger} accountType="cash" />
            </TabsContent>
            <TabsContent value="bank" className="m-0">
              <LedgerView initialData={bankLedger} accountType="bank" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
