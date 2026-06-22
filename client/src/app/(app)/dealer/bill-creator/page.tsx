'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';


export default function BillCreatorPage() {
  const { companyId } = useCompany();
  // In a real app, this would be the logged-in dealer's ID
  const currentDealerId = 'DLR-001'; 

  const { data: bills = [], isLoading: isLoadingbills } = useGenericQuery<any>('billing/custom-bills', companyId ?? undefined);

  return (
    <>
      <PageHeader
        title="Bill Creator"
        description="Create and manage custom bills for subscribers."
      />
      <Card>
        <CardContent className="p-0">
          <ClientPage data={bills} />
        </CardContent>
      </Card>
    </>
  );
}
