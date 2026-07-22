'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, Ruler, CheckCircle, Scale } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

import { ClientPage } from './_components/client-page';

export default function UnitTypesPage() {
  const { companyId } = useCompany();

  const { data: unitTypes = [], isLoading, error } = useGenericQuery<any>('inventory/unit-types', companyId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading unit types...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Failed to load unit types</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 text-white shadow-sm">
          <Ruler className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unit Types</h1>
          <p className="text-sm text-muted-foreground">Manage units of measurement for products.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-blue-500/50 via-indigo-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Ruler className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Types</p>
              <p className="text-2xl font-bold">{Array.isArray(unitTypes) ? unitTypes.length : 0}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Types</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {Array.isArray(unitTypes) ? unitTypes.filter((u: any) => u.status === 'active' || u.status === 'Active').length : 0}
              </p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold">
                {Array.isArray(unitTypes) ? new Set(unitTypes.map((u: any) => u.category).filter(Boolean)).size : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <ClientPage data={unitTypes} />
        </CardContent>
      </Card>
    </div>
  );
}
