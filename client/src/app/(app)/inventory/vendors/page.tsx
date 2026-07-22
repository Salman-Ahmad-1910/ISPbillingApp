'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, Truck, Building, Phone } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

import { ClientPage } from './_components/client-page';

export default function VendorsPage() {
  const { companyId } = useCompany();

  const { data: vendors = [], isLoading, error } = useGenericQuery<any>('inventory/vendors', companyId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading vendors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Failed to load vendors</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 p-2.5 text-white shadow-sm">
          <Truck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground">Manage your suppliers and vendors for inventory purchases.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-cyan-500/50 via-teal-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Vendors</p>
              <p className="text-2xl font-bold">{Array.isArray(vendors) ? vendors.length : 0}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">With Contact</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {Array.isArray(vendors) ? vendors.filter((v: any) => v.contactPerson || v.phone).length : 0}
              </p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">With Phone</p>
              <p className="text-2xl font-bold">
                {Array.isArray(vendors) ? vendors.filter((v: any) => v.phone).length : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <ClientPage data={vendors} />
        </CardContent>
      </Card>
    </div>
  );
}
