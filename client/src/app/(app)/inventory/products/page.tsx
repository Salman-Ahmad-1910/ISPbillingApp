'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';

import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

export default function ProductsPage() {
  const { companyId } = useCompany();

  const { data: products = [], isLoading } = useGenericQuery<any>('inventory/products', companyId ?? undefined);

  if (!companyId) {
    return (
      <>
        <PageHeader
          title="Products"
          description="Manage your inventory of products and services."
        />
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Please select a company to manage products.
          </CardContent>
        </Card>
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your inventory of products and services."
      >
        {/* <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div> */}
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <ClientPage data={products} />
        </CardContent>
      </Card>
    </>
  );
}
