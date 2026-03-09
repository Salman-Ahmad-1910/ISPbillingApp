'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Map, Pin, Users, Home } from 'lucide-react';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';


import { useCompany } from '@/context/company-context';

export default function AssignedAreaPage() {
    const { companyId } = useCompany();
    const assignedAreaId = 'AREA-001';

    const { data: areas = [], isLoading: isLoadingAreas } = useGenericQuery<any>('network/areas', companyId ?? undefined);
    const { data: subscribers = [], isLoading: isLoadingSubscribers } = useGenericQuery<any>('subscribers', companyId ?? undefined);

    if (isLoadingAreas || isLoadingSubscribers) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const area = areas.find((a: any) => a.id === assignedAreaId);
    const areaSubscribers = subscribers.filter((s: any) => s.areaId === assignedAreaId);

    if (!area) {
        return (
            <PageHeader
                title="No Area Assigned"
                description="Please contact your administrator to be assigned a recovery area."
            />
        )
    }

    return (
        <>
            <PageHeader
                title="My Assigned Area"
                description="Details and statistics for your recovery zone."
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{areaSubscribers.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{areaSubscribers.filter(s => s.status === 'active').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Suspended</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{areaSubscribers.filter(s => s.status === 'suspended').length}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Map className="h-5 w-5" />
                            Area Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Pin className="h-4 w-4 text-muted-foreground" />
                            <strong>City:</strong> {area.city}
                        </div>
                        <div className="flex items-center gap-2">
                            <Pin className="h-4 w-4 text-muted-foreground" />
                            <strong>Zone:</strong> {area.zone}
                        </div>
                        <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <strong>Locality:</strong> {area.locality}
                        </div>
                        <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <strong>Sub-Locality:</strong> {area.subLocality}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
