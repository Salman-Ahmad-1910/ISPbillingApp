'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

export default function GuarantorsPage() {
  const { companyId } = useCompany();

  const { data: guarantors = [], isLoading } = useGenericQuery<any>('crm/guarantors', companyId ?? undefined);

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
        title="Guarantors"
        description="Manage customer guarantors and their information."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={guarantors} />
        </CardContent>
      </Card>
    </>
  );
}
