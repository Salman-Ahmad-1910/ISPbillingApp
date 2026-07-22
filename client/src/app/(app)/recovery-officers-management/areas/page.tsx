'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { MapPinned, Map, Users, Building2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

import type { Area, RecoveryOfficer } from '@/lib/types';
import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';

export default function AreasPage() {
  const { companyId } = useCompany();

  const { data: areas = [], isLoading: isLoadingAreas } = useGenericQuery<Area>('network/areas', companyId ?? undefined);
  const { data: recoveryOfficers = [], isLoading: isLoadingOfficers } = useGenericQuery<RecoveryOfficer>('admin/recovery-officers', companyId ?? undefined);

  const kpiData = useMemo(() => [
    { label: 'Total Areas', value: areas.length, icon: Map, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Cities', value: new Set(areas.map(a => a.city)).size, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Officers Assigned', value: areas.filter(a => a.recoveryOfficerId).length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
  ], [areas]);

  const isLoading = isLoadingAreas || isLoadingOfficers;

  if (companyId && isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><LoadingSpinner text="Loading areas..." /></div>;
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
            <MapPinned className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Area Management</h1>
            <p className="text-sm text-muted-foreground">View and manage areas assigned to recovery officers.</p>
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
          <ClientPage data={areas} recoveryOfficers={recoveryOfficers} />
        </CardContent>
      </Card>
    </>
  );
}
