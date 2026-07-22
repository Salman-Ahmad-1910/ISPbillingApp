'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, Building } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';


export default function CorporateCustomersPage() {
  const { companyId } = useCompany();

  const { data: customers = [], isLoading: isLoadingcustomers } = useGenericQuery<any>('subscribers/corporate', companyId ?? undefined);

  if (isLoadingcustomers) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 text-white shadow-sm">
          <Building className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Corporate Clients</h1>
          <p className="text-sm text-muted-foreground">Manage bulk connections and corporate accounts.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-indigo-500/50 via-purple-500/30 to-transparent" />
      
      <Card>
        <CardContent className="p-0">
          <ClientPage data={customers} />
        </CardContent>
      </Card>
    </div>
  );
}
