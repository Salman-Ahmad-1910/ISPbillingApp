'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function OutstandingReportPage() {
  const { companyId } = useCompany();
  const { data: companyInvoices = [], isLoading } = useGenericQuery<any>('billing/invoices', companyId ?? undefined);

  const outstandingData = useMemo(() => {
    if (!companyId) return [];

    const unpaidInvoices = companyInvoices.filter((inv: any) => inv.status !== 'paid');

    const today = new Date();
    const buckets = {
      '0-30 Days': 0,
      '31-60 Days': 0,
      '61-90 Days': 0,
      '90+ Days': 0,
    };

    unpaidInvoices.forEach((invoice: any) => {
      const dueDate = new Date(invoice.dueDate);
      if (dueDate > today) return; // Not overdue yet

      const daysOverdue = differenceInDays(today, dueDate);

      if (daysOverdue <= 30) {
        buckets['0-30 Days'] += invoice.amount;
      } else if (daysOverdue <= 60) {
        buckets['31-60 Days'] += invoice.amount;
      } else if (daysOverdue <= 90) {
        buckets['61-90 Days'] += invoice.amount;
      } else {
        buckets['90+ Days'] += invoice.amount;
      }
    });

    return Object.entries(buckets).map(([name, value]) => ({ name, value }));

  }, [companyId, companyInvoices]);

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <PageHeader
        title="Outstanding Report"
        description="View outstanding balances and aging reports."
      />
      {companyId ? (
        <Card>
          <CardHeader>
            <CardTitle>Outstanding by Aging</CardTitle>
            <CardDescription>A breakdown of outstanding receivables by their age.</CardDescription>
          </CardHeader>
          <CardContent>
            {outstandingData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={outstandingData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent, value }) => `${name}: ${(percent * 100).toFixed(0)}% (PKR ${value.toLocaleString()})`}
                  >
                    {outstandingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} formatter={(value: number) => `PKR ${value.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                No outstanding invoices for the selected company.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>Please select a company to view the outstanding report.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </>
  );
}
