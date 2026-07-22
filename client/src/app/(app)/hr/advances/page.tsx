'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { HandCoins } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import type { Staff, AdvanceLoan } from '@/lib/types';

export default function AdvancesPage() {
  const { companyId } = useCompany();

  const { data: advancesResponse, isLoading: isLoadingAdvances } = useGenericQuery<AdvanceLoan[]>('hr/advances', companyId ?? undefined);
  const { data: staffResponse, isLoading: isLoadingStaff } = useGenericQuery<Staff[]>('hr/staff', companyId ?? undefined);

  const advances = advancesResponse || [];
  const staff = staffResponse || [];

  if (companyId && (isLoadingAdvances || isLoadingStaff)) {
    return <div className="flex h-[50vh] items-center justify-center"><LoadingSpinner text="Loading advances..." /></div>;
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
            <HandCoins className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Advances & Loans</h1>
            <p className="text-sm text-muted-foreground">Manage salary advances and loans for staff.</p>
          </div>
        </div>
        <div className="h-0.5 mt-4 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />
      </div>

      <Card className="hover:shadow-md transition-all duration-300">
        <CardContent className="p-0">
          <ClientPage data={advances} staff={staff} />
        </CardContent>
      </Card>
    </>
  );
}
