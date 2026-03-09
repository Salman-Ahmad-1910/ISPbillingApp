'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useGenericMutation } from '@/hooks/api/use-generic-mutation';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import type { SystemConfig } from '@/lib/types';

export default function SettingsPage() {
    const { companyId } = useCompany();
    const [isSaving, setIsSaving] = useState(false);

    const { data: config, isLoading } = useGenericQuery<SystemConfig>({
        url: '/admin/config',
        queryKey: ['system-config', companyId],
        enabled: !!companyId,
    });

    const updateConfig = useGenericMutation<SystemConfig>({
        url: '/admin/config',
        method: 'PUT',
        queryKey: ['system-config', companyId],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;

        setIsSaving(true);
        try {
            await updateConfig.mutateAsync(config);
            toast({
                title: 'Success',
                description: 'System configuration updated successfully.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update configuration',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const updateConfigField = (field: keyof SystemConfig, value: any) => {
        if (!config) return;
        const updatedConfig = { ...config, [field]: value };
        updateConfig.setData(updatedConfig);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <>
            <PageHeader
                title="System Configuration"
                description="Manage system-wide settings and preferences"
            />
            <form onSubmit={handleSubmit}>
                <div className="grid gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Configuration</CardTitle>
                            <CardDescription>
                                Manage system-wide settings and preferences
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Auto-Suspend Settings */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="auto-suspend">Auto-Suspend Overdue Subscribers</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Automatically suspend subscribers with overdue payments
                                    </p>
                                </div>
                                <Switch
                                    id="auto-suspend"
                                    checked={config?.autoSuspend || false}
                                    onCheckedChange={(checked) => updateConfigField('autoSuspend', checked)}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="grace-period">Grace Period (Days)</Label>
                                <Input
                                    id="grace-period"
                                    type="number"
                                    min="0"
                                    max="30"
                                    value={config?.gracePeriod || 3}
                                    onChange={(e) => updateConfigField('gracePeriod', parseInt(e.target.value))}
                                    placeholder="Number of days before suspension"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Number of days to wait before suspending overdue subscribers
                                </p>
                            </div>

                            {/* Session Timeout Settings */}
                            <div className="space-y-2">
                                <Label htmlFor="session-timeout">Session Timeout (Minutes)</Label>
                                <Input
                                    id="session-timeout"
                                    type="number"
                                    min="5"
                                    max="1440"
                                    value={config?.sessionTimeout || 60}
                                    onChange={(e) => updateConfigField('sessionTimeout', parseInt(e.target.value))}
                                    placeholder="Session timeout in minutes"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Automatically log out users after this period of inactivity
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Configuration
                        </Button>
                    </div>
                </div>
            </form>
        </>
    );
}
