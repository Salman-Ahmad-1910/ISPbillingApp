'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import type { DealerFranchise } from '@/lib/types';
import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';

export default function DealerFranchisesPage() {
  const { companyId } = useCompany();

  const { data: franchises = [], isLoading } = useGenericQuery<DealerFranchise>('dealers/franchises', companyId ?? undefined);

  if (companyId && isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <PageHeader
        title="Dealer Franchises"
        description="Manage and approve dealer franchises."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={franchises} />
        </CardContent>
      </Card>
    </>
  );
}
