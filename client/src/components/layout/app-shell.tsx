'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Header } from '@/components/layout/header';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { CompanyProvider } from '@/context/company-context';
import { useUser } from '@/hooks/use-user';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

// Roles allowed to view admin-management routes. Consistent with the sidebar
// gating so that navigating by URL (typing the path) respects the same rules.
const ADMIN_ROLES = ['admin', 'owner', 'manager'];
const ADMIN_SETTINGS_PREFIX = '/admin';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only redirect once the auth check has fully settled. Without this, a
    // page mounted right after login could read a stale "logged out" state and
    // bounce the user back to /login before /auth/me resolves.
    if (user === null && !loading) {
      router.replace('/login');
      return;
    }

    // Role-based route guard: admin-management pages must not be reachable by
    // typing their URL directly unless the logged-in user has an admin role.
    // This keeps direct navigation as protected as the sidebar links are.
    if (user && !loading && pathname?.startsWith(ADMIN_SETTINGS_PREFIX)) {
      const isAdminRole = ADMIN_ROLES.includes(user.role);
      if (!isAdminRole) {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router, pathname]);

  if (user === undefined || loading) {
    return <LoadingSpinner text="Loading..." />;
  }

  if (user === null) {
    return null;
  }
  
  return (
    <CompanyProvider>
      <SidebarProvider>
        <SidebarNav />
        <SidebarInset>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-4 md:p-8">{children}</main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </CompanyProvider>
  );
}
