'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { useState, useMemo } from 'react';
import { format, subDays, eachDayOfInterval } from 'date-fns';

export default function CashFlowReportPage() {
  const { companyId } = useCompany();

  const { data: payments = [], isLoading: isLoadingPayments } = useGenericQuery<any>('billing/payments', companyId ?? undefined);
  const { data: expenses = [], isLoading: isLoadingExpenses } = useGenericQuery<any>('accounts/expenses', companyId ?? undefined);

  const cashFlowData = useMemo(() => {
    if (!companyId) return [];

    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 30),
      end: new Date(),
    });

    return last30Days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayIncome = payments
        .filter((p: any) => format(new Date(p.paymentDate), 'yyyy-MM-dd') === dateStr)
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      const dayExpenses = expenses
        .filter((e: any) => format(new Date(e.date || e.createdAt), 'yyyy-MM-dd') === dateStr)
        .reduce((sum: number, e: any) => sum + e.amount, 0);

      return {
        date: format(day, 'MMM dd'),
        income: dayIncome,
        expenses: dayExpenses,
      };
    });
  }, [companyId, payments, expenses]);

  if (companyId && (isLoadingPayments || isLoadingExpenses)) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <PageHeader
        title="Cash Flow Report"
        description="Monitor your business's cash flow over the last 30 days."
      />
      {companyId ? (
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>A visual representation of cash inflow and outflow.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `PKR ${Number(value) / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))' }}
                  formatter={(value: number) => `PKR ${value.toLocaleString()}`}
                />
                <Legend />
                <Area type="monotone" dataKey="income" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Income" />
                <Area type="monotone" dataKey="expenses" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>Please select a company to view the cash flow report.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </>
  );
}
