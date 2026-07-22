'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, Archive, Layers, Package } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

import { ClientPage } from './_components/client-page';

export default function ProductTypesPage() {
  const { companyId } = useCompany();

  const { data: productTypes = [], isLoading, error } = useGenericQuery<any>('inventory/product-types', companyId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading product types...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Failed to load product types</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
          <Archive className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product Types</h1>
          <p className="text-sm text-muted-foreground">Manage product categories and types.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-orange-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Types</p>
              <p className="text-2xl font-bold">{Array.isArray(productTypes) ? productTypes.length : 0}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Products</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {Array.isArray(productTypes) ? productTypes.reduce((s: number, t: any) => s + (Number(t.productCount) || 0), 0) : 0}
              </p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold">
                {Array.isArray(productTypes) ? new Set(productTypes.map((t: any) => t.category).filter(Boolean)).size : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <ClientPage data={productTypes} />
        </CardContent>
      </Card>
    </div>
  );
}
