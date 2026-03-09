'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Header } from '@/components/layout/header';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { CompanyProvider } from '@/context/company-context';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) {
    return null; // Or a loading component
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
