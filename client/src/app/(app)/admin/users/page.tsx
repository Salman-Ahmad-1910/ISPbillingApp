'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useUser } from '@/hooks/use-user';
import { Users, UserCheck, Shield } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

import type { User, Role } from '@/lib/types';
import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';

export default function UsersPage() {
  const { companyId } = useCompany();
  const { user: currentUser } = useUser();

  if (currentUser?.role === 'delivery_officer' || currentUser?.role === 'dealer') {
    return (
      <>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Access Denied</h1>
              <p className="text-sm text-muted-foreground">You don't have permission to access this page.</p>
            </div>
          </div>
          <div className="h-0.5 mt-4 bg-gradient-to-r from-red-500 via-amber-500 to-transparent" />
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">This page is only accessible to administrators and managers.</p>
          </CardContent>
        </Card>
      </>
    );
  }

  const { data: users = [], isLoading: isLoadingUsers } = useGenericQuery<User>('admin/users', companyId ?? undefined);
  const { data: roles = [], isLoading: isLoadingRoles } = useGenericQuery<Role>('admin/roles', companyId ?? undefined);

  const kpiData = useMemo(() => [
    { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Active Users', value: users.filter(u => u.status === 'active').length, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Roles', value: roles.length, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-100' },
  ], [users, roles]);

  const isLoading = isLoadingUsers || isLoadingRoles;

  if (companyId && isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><LoadingSpinner text="Loading users..." /></div>;
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-sm text-muted-foreground">Manage user accounts, roles, and access.</p>
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
          <ClientPage data={users} roles={roles} currentUser={currentUser} />
        </CardContent>
      </Card>
    </>
  );
}
