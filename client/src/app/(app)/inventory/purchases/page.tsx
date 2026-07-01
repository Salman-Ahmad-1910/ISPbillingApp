'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';
import { useCompany } from '@/context/company-context';

import { ClientPage } from './_components/client-page';

export default function PurchasesPage() {
  const { companyId } = useCompany();

  const { data: purchases = [], isLoading, error } = useGenericQuery<any>('inventory/purchases', companyId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Failed to load purchases</div>;
  }

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Manage purchase orders from vendors."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={purchases} />
        </CardContent>
      </Card>
    </>
  );
}
