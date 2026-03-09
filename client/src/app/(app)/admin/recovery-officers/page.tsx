'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';
import type { RecoveryOfficer } from '@/lib/types';

export default function RecoveryOfficersPage() {
  const { companyId } = useCompany();

  const { data: recoveryOfficers = [], isLoading } = useGenericQuery<RecoveryOfficer[]>(
    'admin/recovery-officers',
    companyId ?? undefined
  );

  if (companyId && isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <PageHeader
        title="Recovery Officers"
        description="Manage recovery officers for your company."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={recoveryOfficers} />
        </CardContent>
      </Card>
    </>
  );
}
