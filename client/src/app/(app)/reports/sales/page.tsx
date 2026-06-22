'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { useMemo } from 'react';
import { format } from 'date-fns';

export default function SalesSummaryPage() {
  const { companyId } = useCompany();
  const { data: invoices = [], isLoading: isLoadingInvoices } = useGenericQuery<any>('billing/invoices', companyId ?? undefined);
  const { data: payments = [], isLoading: isLoadingPayments } = useGenericQuery<any>('billing/payments', companyId ?? undefined);

  const salesVsRecoveryData = useMemo(() => {
    if (!companyId) return [];

    const monthlyData: { [key: string]: { sales: number, recovery: number } } = {};

    invoices.forEach((invoice: any) => {
      const month = format(new Date(invoice.dueDate), 'MMM yyyy');
      if (!monthlyData[month]) {
        monthlyData[month] = { sales: 0, recovery: 0 };
      }
      monthlyData[month].sales += invoice.amount;
    });

    payments.forEach((payment: any) => {
      const month = format(new Date(payment.paymentDate), 'MMM yyyy');
      if (!monthlyData[month]) {
        monthlyData[month] = { sales: 0, recovery: 0 };
      }
      monthlyData[month].recovery += payment.amount;
    });

    return Object.entries(monthlyData)
      .map(([month, values]) => ({
        month,
        sales: values.sales / 1000, // in thousands
        recovery: values.recovery / 1000, // in thousands
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  }, [companyId, invoices, payments]);

  if (companyId && (isLoadingInvoices || isLoadingPayments)) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <PageHeader
        title="Sales Summary"
        description="Get a summary of your sales performance."
      />
      {companyId ? (
        <Card>
          <CardHeader>
            <CardTitle>Sales vs Recovery</CardTitle>
            <CardDescription>Comparison of sales and recovery amounts over time (in thousands of PKR).</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={salesVsRecoveryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${value}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))' }}
                  formatter={(value: number, name: string) => [`PKR ${(value * 1000).toLocaleString()}`, name]}
                />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} name="Sales (k)" />
                <Line type="monotone" dataKey="recovery" stroke="hsl(var(--accent))" strokeWidth={2} name="Recovery (k)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>Please select a company to view the sales summary report.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </>
  );
}
