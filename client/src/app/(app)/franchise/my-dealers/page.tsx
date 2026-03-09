'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from '../../admin/dealers/_components/client-page';
import { useCompany } from '@/context/company-context';


export default function MyDealersPage() {
  const { companyId } = useCompany();
  const currentFranchiseId = 'FRAN-001'; // This would be dynamic

  const { data: dealers = [], isLoading: isLoadingdealers } = useGenericQuery<any>('dealers', companyId ?? undefined);
  
  return (
    <>
      <PageHeader
        title="My Dealers"
        description="Manage all dealers operating under your franchise."
      >
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Onboard New Dealer
        </Button>
      </PageHeader>
      
      <Card>
        <CardContent className="p-0">
          <ClientPage data={dealers} />
        </CardContent>
      </Card>
    </>
  );
}
