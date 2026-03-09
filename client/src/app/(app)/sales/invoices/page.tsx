'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { useCompany } from '@/context/company-context';

import { ClientPage } from './_components/client-page';

export default function InvoicesPage() {
  const { companyId } = useCompany();
  const { data: invoices = [], isLoading: isLoadinginvoices } = useGenericQuery<any>('billing/invoices', companyId ?? undefined);
  if (Object.keys({ useGenericQuery }).length && typeof isLoading !== 'undefined' && isLoading) { return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>; }

  const { data: subscribers = [], isLoading: isLoadingsubscribers } = useGenericQuery<any>('subscribers', companyId ?? undefined);

  return (
    <Card>
      <CardContent className="p-0">
        <ClientPage invoices={invoices} subscribers={subscribers} />
      </CardContent>
    </Card>
  );
}
