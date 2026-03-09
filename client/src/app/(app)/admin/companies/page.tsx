'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { ClientPage } from './_components/client-page';

export default function CompaniesPage() {
  return (
    <>
      <PageHeader
        title="Company Management"
        description="Manage all companies in the system."
      />
      
      <Card>
        <CardContent className="p-0">
          <ClientPage />
        </CardContent>
      </Card>
    </>
  );
}
