'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import ClientPage from './_components/client-page';
import { useCompany } from '@/context/company-context';


export default function DealerCollectionPage() {
  const { companyId } = useCompany();

  const { data: collections = [], isLoading, refetch } = useGenericQuery<any>('dealers/collections', companyId ?? undefined);

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
        title="Dealer Collection"
        description="Track payments collected by dealers and manage settlements."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={collections} onRefetch={refetch} />
        </CardContent>
      </Card>
    </>
  );
}
