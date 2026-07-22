'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Wifi, WifiOff, UserX, Pause, Loader2 } from 'lucide-react';
import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import type { Connection } from '@/lib/types';

export default function SubscriberDetailPage() {
  const { companyId } = useCompany();
  const { data: connectionsData, isLoading } = useGenericQuery<Connection[]>('admin/connections', companyId ?? undefined);

  const connections = (connectionsData || []) as Connection[];

  const stats = useMemo(() => {
    const total = connections.length;
    const active = connections.filter(c => c.status === 'active').length;
    const inactive = connections.filter(c => c.status === 'inactive').length;
    const deactivated = connections.filter(c => c.status === 'deactivated').length;
    const suspended = connections.filter(c => c.status === 'suspended').length;
    return { total, active, inactive, deactivated, suspended };
  }, [connections]);

  if (!companyId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 text-white shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Subscriber Detail</h1>
            <p className="text-sm text-muted-foreground">Manage subscriber connections and details.</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Please select a company to manage subscribers.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading subscribers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 text-white shadow-sm">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriber Detail</h1>
          <p className="text-sm text-muted-foreground">Manage subscriber connections and details.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-blue-500/50 via-blue-400/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <WifiOff className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold">{stats.inactive}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-red-500 to-rose-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Deactivated</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.deactivated}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Pause className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Suspended</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.suspended}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <ClientPage connections={connections} />
        </CardContent>
      </Card>
    </div>
  );
}
