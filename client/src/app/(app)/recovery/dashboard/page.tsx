'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Target, CheckCircle, AlertCircle, HandCoins, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { PermissionGuard } from '@/components/PermissionGuard';
import { PERMISSIONS } from '@/lib/permissions';

export default function RecoveryDashboardPage() {
    const { companyId } = useCompany();

    const { data: payments = [], isLoading: isLoadingPayments } = useGenericQuery<any>('billing/payments', companyId ?? undefined);
    const { data: subscribers = [], isLoading: isLoadingSubscribers } = useGenericQuery<any>('subscribers', companyId ?? undefined);
    const { data: invoices = [], isLoading: isLoadingInvoices } = useGenericQuery<any>('billing/invoices', companyId ?? undefined);

    if (isLoadingPayments || isLoadingSubscribers || isLoadingInvoices) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Calculate real metrics from database data
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const todayStr = currentDate.toISOString().split('T')[0];

    // Monthly collections (current month)
    const monthlyCollected = payments
        .filter((p: any) => {
            const paymentDate = new Date(p.paymentDate);
            return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
        })
        .reduce((acc: number, p: any) => acc + p.amount, 0);

    // Today's collection
    const todaysCollection = payments
        .filter((p: any) => p.paymentDate?.startsWith(todayStr))
        .reduce((acc: number, p: any) => acc + p.amount, 0);

    // Total overdue (unpaid invoices)
    const totalOverdue = invoices
        .filter((inv: any) => inv.status === 'overdue' || inv.status === 'pending')
        .reduce((acc: number, inv: any) => acc + inv.amount, 0);

    // Active subscribers count
    const activeSubscribers = subscribers.filter((s: any) => s.status === 'active').length;

    // Monthly target (could be fetched from settings or calculated from average)
    const monthlyTarget = Math.max(monthlyCollected * 1.2, 100000); // 20% more than current or minimum 100k

    // Recovery rate calculation
    const totalBilled = invoices.reduce((acc: number, inv: any) => acc + inv.amount, 0);
    const totalCollected = payments.reduce((acc: number, p: any) => acc + p.amount, 0);
    const recoveryRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

    const kpiData = [
        { title: 'Monthly Target', value: `PKR ${monthlyTarget.toLocaleString()}`, icon: Target },
        { title: 'Collected (Month)', value: `PKR ${monthlyCollected.toLocaleString()}`, icon: CheckCircle },
        { title: 'Total Overdue', value: `PKR ${totalOverdue.toLocaleString()}`, icon: AlertCircle },
        { title: 'Today\'s Collection', value: `PKR ${todaysCollection.toLocaleString()}`, icon: HandCoins },
    ];

    const additionalMetrics = [
        { title: 'Active Subscribers', value: activeSubscribers.toLocaleString() },
        { title: 'Recovery Rate', value: `${recoveryRate.toFixed(1)}%` },
        { title: 'Total Payments', value: payments.length.toLocaleString() },
        { title: 'Pending Invoices', value: invoices.filter((inv: any) => inv.status === 'pending').length.toLocaleString() },
    ];

    const targetProgress = Math.min((monthlyCollected / monthlyTarget) * 100, 100);

    return (
        <PermissionGuard permission={PERMISSIONS.DASHBOARD_VIEW} fallback={<div className="p-6 text-center text-red-600">Access Denied: Dashboard access required</div>}>
            <>
                <PageHeader
                    title="Recovery Dashboard"
                    description="Your daily and monthly collection overview with real-time data."
                />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {kpiData.map((kpi) => (
                        <Card key={kpi.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                                <kpi.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{kpi.value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {additionalMetrics.map((metric) => (
                        <Card key={metric.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metric.value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Target Progress</CardTitle>
                            <CardDescription>You have achieved {targetProgress.toFixed(1)}% of your monthly target.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Progress value={targetProgress} className="h-4" />
                            <div className="mt-2 text-sm text-muted-foreground">
                                PKR {monthlyCollected.toLocaleString()} of PKR {monthlyTarget.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        </PermissionGuard>
    );
}
