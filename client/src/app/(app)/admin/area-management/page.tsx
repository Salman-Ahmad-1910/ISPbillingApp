'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import type { Area, Staff } from '@/lib/types';
import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';


export default function AreaManagementPage() {
  const { companyId } = useCompany();

  const { data: areas = [], isLoading: isLoadingAreas } = useGenericQuery<Area>('network/areas', companyId ?? undefined);
  const { data: staff = [], isLoading: isLoadingStaff } = useGenericQuery<Staff>('hr/staff', companyId ?? undefined);

  if (companyId && (isLoadingAreas || isLoadingStaff)) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <PageHeader
        title="Area Management"
        description="Assign areas to franchises, dealers, and recovery officers."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={areas} staff={staff} />
        </CardContent>
      </Card>
    </>
  );
}
