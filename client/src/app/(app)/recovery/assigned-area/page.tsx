'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Map, Pin, Users, Home, Loader2, MapPin, Target } from 'lucide-react';


import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

export default function AssignedAreaPage() {
    const { companyId } = useCompany();
    const assignedAreaId = 'AREA-001';

    const { data: areas = [], isLoading: isLoadingAreas } = useGenericQuery<any>('network/areas', companyId ?? undefined);
    const { data: subscribers = [], isLoading: isLoadingSubscribers } = useGenericQuery<any>('subscribers', companyId ?? undefined);

    if (isLoadingAreas || isLoadingSubscribers) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Loading area data...</p>
                </div>
            </div>
        );
    }

    const area = areas.find((a: any) => a.id === assignedAreaId);
    const areaSubscribers = subscribers.filter((s: any) => s.areaId === assignedAreaId);

    const activeSubscribers = areaSubscribers.filter(s => s.status === 'active').length;
    const suspendedSubscribers = areaSubscribers.filter(s => s.status === 'suspended').length;

    if (!area) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
                        <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">No Area Assigned</h1>
                        <p className="text-sm text-muted-foreground">Please contact your administrator to be assigned a recovery area.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm">
                    <Map className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Assigned Area</h1>
                    <p className="text-sm text-muted-foreground">Details and statistics for your recovery zone.</p>
                </div>
            </div>

            <div className="h-0.5 bg-gradient-to-r from-blue-500/50 via-cyan-500/30 to-transparent" />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Total Subscribers</p>
                            <p className="text-3xl font-bold mt-1">{areaSubscribers.length}</p>
                        </div>
                        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                </div>
                <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Active</p>
                            <p className="text-3xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{activeSubscribers}</p>
                        </div>
                        <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                            <Target className="h-5 w-5" />
                        </div>
                    </div>
                </div>
                <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Suspended</p>
                            <p className="text-3xl font-bold mt-1 text-destructive">{suspendedSubscribers}</p>
                        </div>
                        <div className="rounded-lg bg-gradient-to-br from-rose-500 to-red-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                            <MapPin className="h-5 w-5" />
                        </div>
                    </div>
                </div>
                <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Recovery Rate</p>
                            <p className="text-3xl font-bold mt-1">
                                {areaSubscribers.length > 0 ? Math.round((activeSubscribers / areaSubscribers.length) * 100) : 0}%
                            </p>
                        </div>
                        <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                            <Target className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            </div>

            <Card className="transition-all duration-300 hover:shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Map className="h-5 w-5 text-blue-500" />
                        Area Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <Pin className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">City</p>
                                <p className="font-medium">{area.city}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <Pin className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Zone</p>
                                <p className="font-medium">{area.zone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <Home className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Locality</p>
                                <p className="font-medium">{area.locality}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <Home className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Sub-Locality</p>
                                <p className="font-medium">{area.subLocality}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
