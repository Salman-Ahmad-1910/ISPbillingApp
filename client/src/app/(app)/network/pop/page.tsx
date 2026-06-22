'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';


export default function POPPage() {
  const { companyId } = useCompany();

  const { data: pops = [], isLoading } = useGenericQuery<any>('network/pops', companyId ?? undefined);
  if (isLoading) { return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>; }

  return (
    <>
      <PageHeader
        title="POP Management"
        description="Monitor your Point of Presence (POP) locations."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={pops} />
        </CardContent>
      </Card>
    </>
  );
}
