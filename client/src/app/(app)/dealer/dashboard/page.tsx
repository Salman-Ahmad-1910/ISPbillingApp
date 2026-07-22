'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, FileText, Wallet, UserPlus, LayoutDashboard } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

export default function DealerDashboardPage() {
    const { companyId } = useCompany();

    const { data: dashboardData, isLoading } = useGenericQuery<any>('dealers/dashboard', companyId ?? undefined);

    if (isLoading) {
        return <LoadingSpinner text="Loading dashboard..." />;
    }

    const kpiData = [
        { title: 'My Subscribers', value: dashboardData?.subscriberCount || 0, icon: Users, gradient: 'from-blue-500 to-cyan-600' },
        { title: 'Invoices Issued', value: dashboardData?.invoiceCount || 0, icon: FileText, gradient: 'from-amber-500 to-orange-600' },
        { title: 'Total Collection', value: `PKR ${dashboardData?.totalCollection?.toLocaleString() || 0}`, icon: Wallet, gradient: 'from-emerald-500 to-green-600' },
        { title: 'New This Month', value: dashboardData?.newSubscribersThisMonth || 0, icon: UserPlus, gradient: 'from-violet-500 to-purple-600' },
    ];

    const dailyCollection = dashboardData?.dailyCollection || [];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
                    <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dealer Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Your performance overview for the current month.</p>
                </div>
            </div>

            <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />

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

            <Card className="transition-all duration-300 hover:shadow-md">
                <CardHeader>
                    <CardTitle>Daily Collection (Last 7 Days)</CardTitle>
                    <CardDescription>Amount collected by you and your sub-dealers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dailyCollection}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" tickLine={false} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `PKR ${Number(value) / 1000}k`} />
                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))' }} />
                            <Bar dataKey="collection" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
