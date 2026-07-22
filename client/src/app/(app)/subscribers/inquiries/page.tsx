'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, UserPlus } from 'lucide-react';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';


export default function InquiriesPage() {
  const { companyId } = useCompany();

  const { data: inquiries = [], isLoading: isLoadinginquiries } = useGenericQuery<any>('subscribers/inquiries', companyId ?? undefined);
  const { data: areas = [] } = useGenericQuery<any>('network/areas', companyId ?? undefined);
  const { data: boxes = [] } = useGenericQuery<any>('network/boxes', companyId ?? undefined);
  const { data: packages = [] } = useGenericQuery<any>('billing/packages', companyId ?? undefined);

  if (isLoadinginquiries) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-violet-600 p-2.5 text-white shadow-sm">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Inquiries</h1>
          <p className="text-sm text-muted-foreground">Manage leads and potential new subscribers.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-violet-500/30 to-transparent" />
      
      <Card>
        <CardContent className="p-0">
          <ClientPage data={inquiries} areas={areas} boxes={boxes} packages={packages} />
        </CardContent>
      </Card>
    </div>
  );
}
