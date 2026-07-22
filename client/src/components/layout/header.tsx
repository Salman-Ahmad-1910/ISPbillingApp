'use client';

import { Suspense } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from '@/components/layout/user-nav';
import { CircleDollarSign } from 'lucide-react';
import { CompanySelector } from '@/components/CompanySelector';

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center gap-4 border-b bg-card/95 backdrop-blur-sm px-4 md:px-6 shadow-sm">
      <SidebarTrigger className="md:hidden" />
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
          <CircleDollarSign className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-semibold hidden sm:block tracking-tight">FinTrack ERP</h1>
      </div>

      <div className="flex items-center gap-2 ml-2 flex-1">
        <div className="h-6 w-px bg-gradient-to-b from-emerald-500/50 to-transparent mx-2 hidden sm:block" />
        <Suspense>
          <CompanySelector className="w-[250px] sm:w-[300px] md:w-[350px]" />
        </Suspense>
      </div>

      <div className="ml-auto">
        <UserNav />
      </div>
    </header>
  );
}
