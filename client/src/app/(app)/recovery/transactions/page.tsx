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

  return (
    <>
      <PageHeader
        title="Recovery Transactions"
        description="Manage your financial transactions like cash floats and expenses."
      />
      
      <Card>
        <CardContent className="p-0">
          <ClientPage data={transactions} officerId={user?.id || ''} />
        </CardContent>
      </Card>
    </>
  );
}
