'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';
import { useCompany } from '@/context/company-context';

import { ClientPage } from './_components/client-page';

export default function ProductTypesPage() {
  const { companyId } = useCompany();

  const { data: productTypes = [], isLoading, error } = useGenericQuery<any>('inventory/product-types', companyId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Failed to load product types</div>;
  }

  return (
    <>
      <PageHeader
        title="Product Types"
        description="Manage product categories and types."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={productTypes} />
        </CardContent>
      </Card>
    </>
  );
}
