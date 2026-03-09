'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

export default function SubscriberReportsPage() {
  const { companyId } = useCompany();

  const { data: subscribers = [], isLoading: isLoadingSubscribers } = useGenericQuery<any>('subscribers', companyId ?? undefined);
  const { data: invoices = [], isLoading: isLoadingInvoices } = useGenericQuery<any>('billing/invoices', companyId ?? undefined);

  const subscriberChartData = useMemo(() => {
    if (!companyId || subscribers.length === 0) return [];

    const firstConnection = subscribers.reduce((earliest: Date, s: any) => {
      try {
        const date = new Date(s.connectionDate);
        if (date < earliest) return date;
      } catch (e) { /* ignore */ }
      return earliest;
    }, new Date());

    const months = eachMonthOfInterval({
      start: startOfMonth(firstConnection),
      end: new Date()
    });

    return months.map(month => {
      const monthKey = format(month, 'MMM yyyy');

      const newSubs = subscribers.filter((s: any) => {
        try {
          return format(new Date(s.connectionDate), 'MMM yyyy') === monthKey;
        } catch (e) { return false; }
      }).length;

      const churnedSubs = subscribers.filter((s: any) => {
        try {
          return s.status === 'deactivated' && format(new Date(s.connectionDate), 'MMM yyyy') === monthKey;
        } catch (e) { return false; }
      }).length;

      const activeSubscribersInMonth = subscribers.filter((s: any) => {
        try {
          return new Date(s.connectionDate) <= endOfMonth(month) && (s.status === 'active' || s.status === 'suspended');
        } catch (e) { return false; }
      }).length;

      const revenueInMonth = invoices
        .filter((i: any) => {
          try {
            return format(new Date(i.dueDate), 'MMM yyyy') === monthKey;
          } catch (e) { return false; }
        })
        .reduce((acc: number, i: any) => acc + i.amount, 0);

      const arpu = activeSubscribersInMonth > 0 ? revenueInMonth / activeSubscribersInMonth : 0;

      return {
        month: format(month, 'MMM'),
        new: newSubs,
        churn: churnedSubs,
        arpu: Math.round(arpu)
      };
    });
  }, [companyId, subscribers, invoices]);

  if (companyId && (isLoadingSubscribers || isLoadingInvoices)) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!companyId) {
    return (
      <>
        <PageHeader
          title="Subscriber Reports"
          description="Analyze subscriber growth, churn, and ARPU."
        />
        <Card>
          <CardHeader>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>Please select a company to view subscriber reports.</CardDescription>
          </CardHeader>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Subscriber Reports"
        description="Analyze subscriber growth, churn, and ARPU."
      />
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Subscriber Growth & Churn</CardTitle>
            <CardDescription>Monthly new subscribers vs. churned subscribers.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={subscriberChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} />
                <Legend />
                <Line type="monotone" dataKey="new" stroke="hsl(var(--primary))" name="New Subscribers" />
                <Line type="monotone" dataKey="churn" stroke="hsl(var(--destructive))" name="Churned Subscribers" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Revenue Per User (ARPU)</CardTitle>
            <CardDescription>Monthly trend of ARPU.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={subscriberChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `PKR ${value}`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} formatter={(value: number) => `PKR ${value.toLocaleString()}`} />
                <Area type="monotone" dataKey="arpu" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.2} name="ARPU" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
