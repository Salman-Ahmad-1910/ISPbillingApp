'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';

export default function DealersPage() {
  const { companyId } = useCompany();
  
  if (!companyId) {
    return (
      <>
        <PageHeader
          title="Dealers"
          description="Manage dealers for your company."
        />
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Please select a company to manage dealers.
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Dealers"
        description="Manage dealers for your company."
      />
      
      <Card>
        <CardContent className="p-0">
          <ClientPage />
        </CardContent>
      </Card>
    </>
  );
}
