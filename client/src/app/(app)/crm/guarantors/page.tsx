'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, UserCheck } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';

export default function GuarantorsPage() {
  const { companyId } = useCompany();

  const { data: guarantors = [], isLoading } = useGenericQuery<any>('crm/guarantors', companyId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 p-2.5 text-white shadow-sm">
          <UserCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guarantors</h1>
          <p className="text-sm text-muted-foreground">Manage customer guarantors and their information.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-teal-500/50 via-cyan-500/30 to-transparent" />

      <Card>
        <CardContent className="p-0">
          <ClientPage data={guarantors} />
        </CardContent>
      </Card>
    </div>
  );
}
