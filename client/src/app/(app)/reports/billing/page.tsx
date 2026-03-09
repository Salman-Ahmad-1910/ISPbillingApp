'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { useMemo } from 'react';
import { format } from 'date-fns';

export default function BillingReportsPage() {
  const { companyId } = useCompany();

  const { data: invoices = [], isLoading: isLoadingInvoices } = useGenericQuery<any>('billing/invoices', companyId ?? undefined);
  const { data: subscribers = [], isLoading: isLoadingSubscribers } = useGenericQuery<any>('subscribers', companyId ?? undefined);

  const monthlyRevenue = useMemo(() => {
    if (!companyId) return [];

    const monthlyData: { [key: string]: number } = {};

    invoices.forEach((invoice: any) => {
      const month = format(new Date(invoice.dueDate), 'MMM yyyy');
      if (!monthlyData[month]) {
        monthlyData[month] = 0;
      }
      monthlyData[month] += invoice.amount;
    });

    return Object.entries(monthlyData).map(([name, revenue]) => ({
      name,
      revenue,
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

  }, [companyId, invoices]);

  const revenueByPackage = useMemo(() => {
    if (!companyId) return [];

    const packageRevenue: { [key: string]: number } = {};

    invoices.forEach((invoice: any) => {
      const subscriber = subscribers.find((s: any) => s.id === invoice.subscriberId);
      if (subscriber) {
        const packageName = subscriber.packageName || 'Unknown';
        if (!packageRevenue[packageName]) {
          packageRevenue[packageName] = 0;
        }
        packageRevenue[packageName] += invoice.amount;
      }
    });

    return Object.entries(packageRevenue).map(([name, revenue]) => ({
      name,
      revenue
    }));

  }, [companyId, invoices, subscribers]);

  if (companyId && (isLoadingInvoices || isLoadingSubscribers)) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!companyId) {
    return (
      <>
        <PageHeader
          title="Billing Reports"
          description="Analyze revenue, collections, and outstanding balances."
        />
        <Card>
          <CardHeader>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>Please select a company to view billing reports.</CardDescription>
          </CardHeader>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Billing Reports"
        description="Analyze revenue, collections, and outstanding balances."
      />
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Total revenue generated per month.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `PKR ${Number(value) / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} formatter={(value: number) => `PKR ${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Package</CardTitle>
            <CardDescription>Breakdown of revenue from different subscriber packages.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={revenueByPackage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => `PKR ${Number(value) / 1000}k`} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} formatter={(value: number) => `PKR ${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(var(--accent))" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
