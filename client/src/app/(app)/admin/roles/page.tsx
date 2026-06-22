'use client';

import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';
import type { Role } from '@/lib/types';

import { ClientPage } from './_components/client-page';

export default function RolesPage() {
  const { companyId } = useCompany();

  const { data: roles = [], isLoading } = useGenericQuery<Role>('admin/roles', companyId ?? undefined);

  if (companyId && isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return <ClientPage data={roles} />;
}
