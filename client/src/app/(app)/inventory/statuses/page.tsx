'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';
import { useCompany } from '@/context/company-context';

import { ClientPage } from './_components/client-page';

export default function InventoryStatusesPage() {
  const { companyId } = useCompany();

  const { data: products = [], isLoading, error } = useGenericQuery<any>('inventory/products', companyId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Failed to load inventory status</div>;
  }

  return (
    <>
      <PageHeader
        title="Inventory Status"
        description="View current stock levels of all products."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={products} />
        </CardContent>
      </Card>
    </>
  );
}
