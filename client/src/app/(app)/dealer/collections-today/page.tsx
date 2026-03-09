'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useUser } from '@/hooks/use-user';
import { useCompany } from '@/context/company-context';

export default function RecoveryTransactionsPage() {
  const { companyId } = useCompany();
  const { user } = useUser();

  const { data: transactions = [], isLoading: isLoadingtransactions } = useGenericQuery<any>('recovery/transactions', companyId ?? undefined);


    const today = new Date().toISOString().split('T')[0];
  const todaysCollections = transactions.filter((payment: any) => 
    payment?.createdAt?.startsWith(today) || payment?.date?.startsWith(today)
  );


  return (
    <>
      <PageHeader
        title="Today's Collections"
        description="A summary of all payments collected today by you and your sub-dealers."
      />
      
      <Card>
        <CardContent className="p-0">
          <ClientPage data={todaysCollections} officerId={user?.id || ''} />
        </CardContent>
      </Card>
    </>
  );
}
