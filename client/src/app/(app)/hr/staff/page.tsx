'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import type { Staff } from '@/lib/types';
import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';


export default function StaffPage() {
  const { companyId } = useCompany();

  const { data: staff = [], isLoading } = useGenericQuery<Staff>('hr/staff', companyId ?? undefined);

  if (companyId && isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <PageHeader
        title="Staff Management"
        description="Manage employee profiles, salaries, and departments."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={staff} />
        </CardContent>
      </Card>
    </>
  );
}
