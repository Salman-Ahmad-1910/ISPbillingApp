'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useCompany } from '@/context/company-context';
import { useSubscribers } from '@/hooks/api/use-subscribers';
import { Loader2 } from 'lucide-react';
import { ClientPage } from './_components/client-page';

export default function SubscribersPage() {
  const { companyId } = useCompany();
  const { data: subscribers = [], isLoading, error } = useSubscribers(companyId);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Failed to load subscribers</div>;
  }

  return (
    <>
      <PageHeader
        title="Subscribers"
        description="Manage your subscribers, their packages, and billing status."
      />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={subscribers} />
        </CardContent>
      </Card>
    </>
  );
}
