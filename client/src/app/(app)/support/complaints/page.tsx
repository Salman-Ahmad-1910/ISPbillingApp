'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';
import type { Staff, Complaint, Subscriber } from '@/lib/types';


export default function ComplaintsPage() {
  const { companyId } = useCompany();

  const { data: complaints = [], isLoading: isLoadingComplaints } = useGenericQuery<Complaint>('support/complaints', companyId ?? undefined);
  const { data: subscribers = [], isLoading: isLoadingSubscribers } = useGenericQuery<Subscriber>('subscribers', companyId ?? undefined);
  const { data: staffData = [], isLoading: isLoadingStaff } = useGenericQuery<Staff>('hr/staff', companyId ?? undefined);

  if (!companyId) {
    return (
      <>
        <PageHeader
          title="Complaint Management"
          description="Track and resolve subscriber issues."
        />
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Please select a company to manage complaints.
          </CardContent>
        </Card>
      </>
    );
  }

  if (isLoadingComplaints || isLoadingSubscribers || isLoadingStaff) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <PageHeader
        title="Complaint Management"
        description="Track and resolve subscriber issues."
      />
      <Card>
        <CardContent className="p-0">
          <ClientPage data={complaints} subscribers={subscribers} staff={staffData} />
        </CardContent>
      </Card>
    </>
  );
}
