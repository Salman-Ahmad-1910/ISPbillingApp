'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, FileText, Wallet, UserPlus, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

const dailyCollection = [
    { day: 'Mon', collection: 7500 },
    { day: 'Tue', collection: 9000 },
    { day: 'Wed', collection: 6500 },
    { day: 'Thu', collection: 11000 },
    { day: 'Fri', collection: 8200 },
    { day: 'Sat', collection: 15000 },
    { day: 'Sun', collection: 4500 },
];

export default function DealerDashboardPage() {
    const { companyId } = useCompany();

    const { data: dashboardData, isLoading } = useGenericQuery<any>('dealers/dashboard', companyId ?? undefined);

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const kpiData = [
        { title: 'My Subscribers', value: dashboardData?.subscriberCount || 0, icon: Users },
        { title: 'Invoices Issued', value: dashboardData?.invoiceCount || 0, icon: FileText },
        { title: 'Total Collection', value: `PKR ${dashboardData?.totalCollection?.toLocaleString() || 0}`, icon: Wallet },
        { title: 'New This Month', value: dashboardData?.newSubscribersThisMonth || 0, icon: UserPlus },
    ];

    // Process real collection data (mock for now since we don't have daily collection endpoint)
    const dailyCollection = [
        { day: 'Mon', collection: 7500 },
        { day: 'Tue', collection: 9000 },
        { day: 'Wed', collection: 6500 },
        { day: 'Thu', collection: 11000 },
        { day: 'Fri', collection: 8200 },
        { day: 'Sat', collection: 15000 },
        { day: 'Sun', collection: 4500 },
    ];

    return (
        <>
            <PageHeader
                title="Dealer Dashboard"
                description="Your performance overview for the current month."
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

            <div className="mt-8">
                <Card>
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
        </>
    );
}
