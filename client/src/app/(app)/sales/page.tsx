'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';

export default function SalesPage() {
  const { companyId } = useCompany();

  const { data: sales = [], isLoading } = useGenericQuery<any>('pos/sales', companyId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Sales"
        description="View and manage all point-of-sale transactions."
      />
      <Card>
        <CardContent className="p-0">
          <ClientPage data={sales} />
        </CardContent>
      </Card>
    </>
  );
}
