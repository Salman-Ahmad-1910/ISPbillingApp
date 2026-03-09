'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import type { Staff, AdvanceLoan } from '@/lib/types';

export default function AdvancesPage() {
  const { companyId } = useCompany();

  const { data: advancesResponse, isLoading: isLoadingAdvances } = useGenericQuery<AdvanceLoan[]>('hr/advances', companyId ?? undefined);
  const { data: staffResponse, isLoading: isLoadingStaff } = useGenericQuery<Staff[]>('hr/staff', companyId ?? undefined);

  // Extract data arrays from API responses
  const advances = advancesResponse || [];
  const staff = staffResponse || [];

  if (companyId && (isLoadingAdvances || isLoadingStaff)) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <PageHeader
        title="Advances & Loans"
        description="Manage salary advances and loans for staff."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={advances} staff={staff} />
        </CardContent>
      </Card>
    </>
  );
}
