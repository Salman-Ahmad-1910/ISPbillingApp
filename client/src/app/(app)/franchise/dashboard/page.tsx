'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Handshake, Wallet, UserPlus, Loader2 } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

export default function FranchiseDashboardPage() {
    const { companyId } = useCompany();
    const { data: dashboardData, isLoading } = useGenericQuery<any>('dealers/franchise-dashboard', companyId ?? undefined);

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const kpiData = [
        { title: 'Total Dealers', value: dashboardData?.totalDealers || 0, icon: Handshake },
        { title: 'Total Sub-Dealers', value: dashboardData?.totalSubDealers || 0, icon: Users },
        { title: 'Total Collection', value: `PKR ${dashboardData?.totalCollection?.toLocaleString() || 0}`, icon: Wallet },
        { title: 'Active Subscribers', value: dashboardData?.subscriberCount || 0, icon: UserPlus },
    ];

    return (
        <>
            <PageHeader
                title="Franchise Dashboard"
                description="An overview of your entire franchise network."
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

            {/* Additional charts and tables can be added here */}
        </>
    );
}
