'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

export default function InstallmentPlansPage() {
  const { companyId } = useCompany();

  const { data: plans = [], isLoading: isLoadingPlans } = useGenericQuery<any>('sales/installment-plans', companyId ?? undefined);
  const { data: products = [], isLoading: isLoadingProducts } = useGenericQuery<any>('inventory/products', companyId ?? undefined);

  if (isLoadingPlans || isLoadingProducts) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Installment Plans"
        description="Create and manage installment plans for products."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={plans} products={products} />
        </CardContent>
      </Card>
    </>
  );
}
