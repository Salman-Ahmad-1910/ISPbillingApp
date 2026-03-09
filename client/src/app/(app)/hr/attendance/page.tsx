'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import type { Staff, Attendance } from '@/lib/types';

export default function AttendancePage() {
  const { companyId } = useCompany();

  const { data: attendance = [], isLoading: isLoadingAttendance } = useGenericQuery<Attendance>('hr/attendance', companyId ?? undefined);
  const { data: staff = [], isLoading: isLoadingStaff } = useGenericQuery<Staff>('hr/staff', companyId ?? undefined);

  if (companyId && (isLoadingAttendance || isLoadingStaff)) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <PageHeader
        title="Staff Attendance"
        description="Track employee check-ins, check-outs, and shifts."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={attendance} staff={staff} />
        </CardContent>
      </Card>
    </>
  );
}
