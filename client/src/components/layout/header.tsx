'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from '@/components/layout/user-nav';
import { CircleDollarSign } from 'lucide-react';
import { CompanySelector } from '@/components/CompanySelector';
import { useCompany } from '@/context/company-context';

export function Header() {
  const { companies, companyId } = useCompany();
  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center gap-4 border-b bg-card px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
          <CircleDollarSign className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-lg font-semibold hidden sm:block">FinTrack ERP</h1>
      </div>

      <div className="flex items-center gap-2 ml-2 flex-1">
        <div className="h-6 w-px bg-border mx-2 hidden sm:block" />
        <CompanySelector className="w-[250px] sm:w-[300px] md:w-[350px]" />
      </div>

      <div className="ml-auto">
        <UserNav />
      </div>
    </header>
  );
}
