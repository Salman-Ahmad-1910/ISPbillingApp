'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';


export default function SubDealersPage() {
  const { companyId } = useCompany();
  const currentDealerId = 'DLR-001'; // This would be dynamic based on logged in user

  const { data: subDealers = [], isLoading: isLoadingsubDealers } = useGenericQuery<any>('dealers', companyId ?? undefined);

  return (
    <>
      <PageHeader
        title="My Sub-Dealers"
        description="Manage your network of sub-dealers."
      />
      
      <Card>
        <CardContent className="p-0">
          <ClientPage data={subDealers} />
        </CardContent>
      </Card>
    </>
  );
}
