'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { useCompany } from '@/context/company-context';

import { ClientPage } from '../../sales/_components/replaced-products-page';

export default function ReplacedProductsPage() {
  const { companyId } = useCompany();

  const { data: replacedSales = [], isLoading, error } = useGenericQuery<any>(
    'pos/sales',
    companyId ?? undefined,
    { salesType: 'replaced' },
  );

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading replaced products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Failed to load replaced products</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm">
          <RefreshCw className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Replaced Products</h1>
          <p className="text-sm text-muted-foreground">
            Track products that were returned and replaced with a new item.
          </p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-violet-500/50 via-purple-500/30 to-transparent" />

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <ClientPage data={Array.isArray(replacedSales) ? replacedSales : []} />
        </CardContent>
      </Card>
    </div>
  );
}