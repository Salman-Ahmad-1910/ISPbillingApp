'use client';

import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { ClientPage } from './_components/client-page';

export default function BillCreatorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 p-2.5 text-white shadow-sm">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bill Creator</h1>
          <p className="text-sm text-muted-foreground">Create and manage monthly bills for subscribers.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-purple-500/50 via-purple-400/30 to-transparent" />

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <ClientPage />
        </CardContent>
      </Card>
    </div>
  );
}
