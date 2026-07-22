'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { KeyRound, ShieldCheck, Users } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import type { Role } from '@/lib/types';

import { ClientPage } from './_components/client-page';

export default function RolesPage() {
  const { companyId } = useCompany();

  const { data: roles = [], isLoading } = useGenericQuery<Role>('admin/roles', companyId ?? undefined);

  const kpiData = useMemo(() => [
    { label: 'Total Roles', value: roles.length, icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'With Users', value: roles.filter(r => (r as any)._count?.users || 0).length, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Permissions', value: new Set(roles.flatMap(r => (r as any).permissions || [])).size, icon: KeyRound, color: 'text-purple-600', bg: 'bg-purple-100' },
  ], [roles]);

  if (companyId && isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><LoadingSpinner text="Loading roles..." /></div>;
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Role Management</h1>
            <p className="text-sm text-muted-foreground">Manage roles, permissions, and access levels.</p>
          </div>
        </div>
        <div className="h-0.5 mt-4 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {kpiData.map((metric) => (
          <div key={metric.label} className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
              <div className={`rounded-lg ${metric.bg} p-2.5 transition-all duration-300 group-hover:scale-110`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              ) : (
                <p className="text-2xl font-bold">{metric.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Card className="hover:shadow-md transition-all duration-300">
        <CardContent className="p-0">
          <ClientPage data={roles} />
        </CardContent>
      </Card>
    </>
  );
}
