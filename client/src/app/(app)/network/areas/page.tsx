'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, MapPin } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';


export default function AreasPage() {
  const { companyId } = useCompany();

  const { data: areas = [], isLoading } = useGenericQuery<any>('network/areas', companyId ?? undefined);
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading areas...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2 text-white shadow-sm">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Area Management</h1>
            <p className="mt-1 text-muted-foreground">Define and manage your service coverage areas.</p>
          </div>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent mb-6" />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={areas} />
        </CardContent>
      </Card>
    </>
  );
}
