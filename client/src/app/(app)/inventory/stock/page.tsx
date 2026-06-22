'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';


export default function StockPage() {
  const { companyId } = useCompany();

  const { data: items = [], isLoading } = useGenericQuery<any>('inventory/items', companyId ?? undefined);

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
        title="Inventory & Stock"
        description="Manage your stock of routers, ONTs, and other equipment."
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
          <ClientPage data={items} />
        </CardContent>
      </Card>
    </>
  );
}
