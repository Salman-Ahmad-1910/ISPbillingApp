'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Header } from '@/components/layout/header';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { CompanyProvider } from '@/context/company-context';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Only redirect once the auth check has fully settled. Without this, a
    // page mounted right after login could read a stale "logged out" state and
    // bounce the user back to /login before /auth/me resolves.
    if (user === null && !loading) {
      router.replace('/login');
    }
  }, [user, loading, router]);

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
