'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useUser } from '@/hooks/use-user';
import { Loader2 } from 'lucide-react';

import type { User, Role } from '@/lib/types';
import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';

export default function UsersPage() {
  const { companyId } = useCompany();
  const { user: currentUser } = useUser();

  // Hide page for delivery officers and dealers
  if (currentUser?.role === 'delivery_officer' || currentUser?.role === 'dealer') {
    return (
      <>
        <PageHeader
          title="Access Denied"
          description="You don't have permission to access this page."
        />
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

  if (companyId && (isLoadingUsers || isLoadingRoles)) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage user accounts, roles, and access."
      >
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <ClientPage data={users} roles={roles} currentUser={currentUser} />
        </CardContent>
      </Card>
    </>
  );
}
