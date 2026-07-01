'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';
import { useCompany } from '@/context/company-context';

import { ClientPage } from './_components/client-page';

export default function BrandsPage() {
  const { companyId } = useCompany();

  const { data: brands = [], isLoading, error } = useGenericQuery<any>('inventory/brands', companyId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Failed to load brands</div>;
  }

  return (
    <>
      <PageHeader
        title="Brands"
        description="Manage product brands and manufacturers."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={brands} />
        </CardContent>
      </Card>
    </>
  );
}
