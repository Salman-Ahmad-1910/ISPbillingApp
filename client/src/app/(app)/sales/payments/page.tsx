'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import { usePayments } from '@/hooks/api/use-payments';
import { Loader2 } from 'lucide-react';

export default function PaymentsPage() {
  const { companyId } = useCompany();
  const { data: payments = [], isLoading, error } = usePayments(companyId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  console.log('payments: ',payments)

  if (error) {
    return <div className="p-4 text-red-500">Failed to load payments</div>;
  }

  return (
    <>
      <PageHeader
        title="Payments / Recoveries"
        description="Record and track customer payments and installment recoveries."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <ClientPage data={payments} />
        </CardContent>
      </Card>
    </>
  );
}
