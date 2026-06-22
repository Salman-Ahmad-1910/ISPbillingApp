'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

export default function PlansPage() {
  const { companyId } = useCompany();

  const { data: plans = [], isLoading } = useGenericQuery<any>('inventory/plans', companyId ?? undefined);

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
        title="Pricing / Plans"
        description="Define pricing structures and plans for your products."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={plans} />
        </CardContent>
      </Card>
    </>
  );
}
