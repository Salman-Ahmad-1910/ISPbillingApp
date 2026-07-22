'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { ClientPage } from './_components/client-page';

export default function CompaniesPage() {
  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Company Management</h1>
            <p className="text-sm text-muted-foreground">Manage all companies in the system.</p>
          </div>
        </div>
        <div className="h-0.5 mt-4 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />
      </div>

      <Card className="hover:shadow-md transition-all duration-300">
        <CardContent className="p-0">
          <ClientPage />
        </CardContent>
      </Card>
    </>
  );
}
