'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, HandCoins, Wallet, DollarSign } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useUser } from '@/hooks/use-user';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

export default function RecoveryTransactionsPage() {
  const { companyId } = useCompany();
  const { user } = useUser();

  const { data: transactions = [], isLoading: isLoadingtransactions } = useGenericQuery<any>('recovery/transactions', companyId ?? undefined);

  const myCollections = transactions?.filter((p: any) => p?.officerId === user?.id);

  const totalAmount = useMemo(() => {
    if (!Array.isArray(myCollections)) return 0;
    return myCollections.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
  }, [myCollections]);

  if (isLoadingtransactions) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading collections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
          <HandCoins className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Collections</h1>
          <p className="text-sm text-muted-foreground">A log of all payments you have collected.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <HandCoins className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Collections</p>
              <p className="text-2xl font-bold">{Array.isArray(myCollections) ? myCollections.length : 0}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">PKR {totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Avg Per Collection</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                PKR {myCollections?.length > 0 ? Math.round(totalAmount / myCollections.length).toLocaleString() : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <ClientPage data={myCollections} officerId={user?.id || ''} />
        </CardContent>
      </Card>
    </div>
  );
}
