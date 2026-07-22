'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, UserRound } from 'lucide-react';

import { CustomerClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';

export default function CustomersPage() {
  const { companyId } = useCompany();

  const { data: customers = [], isLoading } = useGenericQuery<any>('crm/customers', companyId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage your customer profiles, view their history, and track their status.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-orange-500/30 to-transparent" />

      <Card>
        <CardContent className="p-0">
          <CustomerClientPage data={customers} />
        </CardContent>
      </Card>
    </div>
  );
}
