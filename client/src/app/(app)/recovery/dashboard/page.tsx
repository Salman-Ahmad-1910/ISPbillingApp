'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Target, CheckCircle, AlertCircle, HandCoins, Loader2, LayoutDashboard, Users, TrendingUp, CreditCard, Clock } from 'lucide-react';
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
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard data...</p>
                </div>
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
        { title: 'Monthly Target', value: `PKR ${monthlyTarget.toLocaleString()}`, icon: Target, gradient: 'from-indigo-500 to-purple-600' },
        { title: 'Collected (Month)', value: `PKR ${monthlyCollected.toLocaleString()}`, icon: CheckCircle, gradient: 'from-emerald-500 to-green-600' },
        { title: 'Total Overdue', value: `PKR ${totalOverdue.toLocaleString()}`, icon: AlertCircle, gradient: 'from-rose-500 to-red-600' },
        { title: "Today's Collection", value: `PKR ${todaysCollection.toLocaleString()}`, icon: HandCoins, gradient: 'from-amber-500 to-orange-600' },
    ];

    const additionalMetrics = [
        { title: 'Active Subscribers', value: activeSubscribers.toLocaleString(), icon: Users, gradient: 'from-blue-500 to-cyan-600' },
        { title: 'Recovery Rate', value: `${recoveryRate.toFixed(1)}%`, icon: TrendingUp, gradient: 'from-teal-500 to-emerald-600' },
        { title: 'Total Payments', value: payments.length.toLocaleString(), icon: CreditCard, gradient: 'from-violet-500 to-purple-600' },
        { title: 'Pending Invoices', value: invoices.filter((inv: any) => inv.status === 'pending').length.toLocaleString(), icon: Clock, gradient: 'from-amber-500 to-yellow-600' },
    ];

    const targetProgress = Math.min((monthlyCollected / monthlyTarget) * 100, 100);

    return (
        <PermissionGuard permission={PERMISSIONS.DASHBOARD_VIEW} fallback={<div className="p-6 text-center text-red-600">Access Denied: Dashboard access required</div>}>
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 text-white shadow-sm">
                        <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Recovery Dashboard</h1>
                        <p className="text-sm text-muted-foreground">Your daily and monthly collection overview with real-time data.</p>
                    </div>
                </div>

                <div className="h-0.5 bg-gradient-to-r from-indigo-500/50 via-purple-500/30 to-transparent" />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {kpiData.map((kpi) => (
                        <div key={kpi.title} className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                                    <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                                </div>
                                <div className={`rounded-lg bg-gradient-to-br ${kpi.gradient} p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                                    <kpi.icon className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {additionalMetrics.map((metric) => (
                        <div key={metric.title} className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">{metric.title}</p>
                                    <p className="text-2xl font-bold mt-1">{metric.value}</p>
                                </div>
                                <div className={`rounded-lg bg-gradient-to-br ${metric.gradient} p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                                    <metric.icon className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <Card className="transition-all duration-300 hover:shadow-md">
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
        </PermissionGuard>
    );
}
