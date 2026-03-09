'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { CustomerClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

export default function CustomersPage() {
  const { companyId } = useCompany();

  const { data: customers = [], isLoading } = useGenericQuery<any>('crm/customers', companyId ?? undefined);

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
        title="Customers"
        description="Manage your customer profiles, view their history, and track their status."
      />

      <Card>
        <CardContent className="p-0">
          <CustomerClientPage data={customers} />
        </CardContent>
      </Card>
    </>
  );
}
