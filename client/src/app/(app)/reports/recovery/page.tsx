'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { useMemo } from 'react';

export default function RecoveryReportPage() {
  const { companyId } = useCompany();

  const { data: rawReportData, isLoading } = useGenericQuery<any>('reports/sales-vs-recovery', companyId ?? undefined);

  const reportData = useMemo(() => {
    if (!rawReportData || !Array.isArray(rawReportData)) {
      return [];
    }
    return rawReportData.map((d: any) => ({
      month: d.month,
      target: d.sales, // Using sales as target for recovery analysis in this context
      recovered: d.recovery
    }));
  }, [rawReportData]);

  if (companyId && isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <PageHeader
        title="Recovery Report"
        description="Analyze recovery performance and trends against targets."
      />
      {companyId ? (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Recovery Performance</CardTitle>
            <CardDescription>Comparison of targeted vs. recovered amounts each month.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={reportData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `PKR ${Number(value) / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} />
                <Legend />
                <Bar dataKey="target" fill="hsl(var(--secondary))" name="Target" />
                <Bar dataKey="recovered" fill="hsl(var(--primary))" name="Recovered" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>Please select a company to view the recovery report.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </>
  );
}
