'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, ClipboardCheck, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

import { ClientPage } from './_components/client-page';

export default function InventoryStatusesPage() {
  const { companyId } = useCompany();

  const { data: products = [], isLoading, error } = useGenericQuery<any>('inventory/products', companyId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading inventory status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Failed to load inventory status</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-rose-500 to-red-600 p-2.5 text-white shadow-sm">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Status</h1>
          <p className="text-sm text-muted-foreground">View current stock levels of all products.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-rose-500/50 via-red-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-rose-500 to-red-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold">{Array.isArray(products) ? products.length : 0}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">In Stock</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {Array.isArray(products) ? products.filter((p: any) => Number(p.stock) > 0).length : 0}
              </p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {Array.isArray(products) ? products.filter((p: any) => Number(p.stock) > 0 && Number(p.stock) <= 5).length : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <ClientPage data={products} />
        </CardContent>
      </Card>
    </div>
  );
}
