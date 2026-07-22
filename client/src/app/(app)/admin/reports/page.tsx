'use client';

import { BarChart3 } from 'lucide-react';
import { UnifiedReportsDashboard } from './_components/unified-reports-dashboard';

export default function ReportsPage() {
  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-sm text-muted-foreground">View system reports and analytics.</p>
          </div>
        </div>
        <div className="h-0.5 mt-4 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />
      </div>
      <UnifiedReportsDashboard />
    </>
  );
}
