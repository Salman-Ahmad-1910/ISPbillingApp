'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, RadioTower } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';


export default function POPPage() {
  const { companyId } = useCompany();

  const { data: pops = [], isLoading } = useGenericQuery<any>('network/pops', companyId ?? undefined);
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading POPs...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 p-2 text-white shadow-sm">
            <RadioTower className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">POP Management</h1>
            <p className="mt-1 text-muted-foreground">Monitor your Point of Presence (POP) locations.</p>
          </div>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-rose-500/50 via-pink-500/30 to-transparent mb-6" />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={pops} />
        </CardContent>
      </Card>
    </>
  );
}
