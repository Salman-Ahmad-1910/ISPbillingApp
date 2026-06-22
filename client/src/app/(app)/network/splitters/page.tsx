'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';


export default function SplitterPage() {
  const { companyId } = useCompany();

  const { data: splitters = [], isLoading } = useGenericQuery<any>('network/splitters', companyId ?? undefined);
  if (isLoading) { return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>; }

  return (
    <>
      <PageHeader
        title="Splitter Management"
        description="Track your fiber optic splitters and port utilization."
      >

      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <ClientPage data={splitters} />
        </CardContent>
      </Card>
    </>
  );
}
