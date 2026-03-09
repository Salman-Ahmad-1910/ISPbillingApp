'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { LedgerView } from './_components/ledger-view';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

import type { LedgerEntry } from '@/lib/types';

export default function CashBankLedgerPage() {
  const { companyId } = useCompany();

  const { data: cashLedger = [], isLoading: isLoadingCash, error: cashError } = useGenericQuery<LedgerEntry>('accounts/ledger?accountType=cash', companyId ?? undefined);
  const { data: bankLedger = [], isLoading: isLoadingBank, error: bankError } = useGenericQuery<LedgerEntry>('accounts/ledger?accountType=bank', companyId ?? undefined);

  if (isLoadingCash || isLoadingBank) {
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
    <>
      <PageHeader
        title="Cash / Bank Ledger"
        description="Track all cash and bank transactions for your company."
      />
      <Card>
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
    </>
  );
}
