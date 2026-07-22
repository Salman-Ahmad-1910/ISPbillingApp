'use client';

import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SystemConfig } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Settings, Cog, Bell, Shield } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const initialConfig = {
  appName: "FinTrack ISP",
  defaultCurrency: "PKR",
  autoSuspend: true,
  gracePeriod: 3,
  invoiceTemplate: "Invoice footer text, terms and conditions...",
  smsGateway: "",
  whatsAppGateway: "",
  invoiceSms: "Dear {customer_name}, your bill of PKR {amount} for {billing_period} is due on {due_date}. Thank you.",
  enable2fa: false,
  sessionTimeout: 60,
};

const tabs = [
  { value: 'general', label: 'General', icon: Settings },
  { value: 'billing', label: 'Billing & Invoice', icon: Cog },
  { value: 'notifications', label: 'Notifications', icon: Bell },
  { value: 'security', label: 'Security', icon: Shield },
];

export default function SystemConfigPage() {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<any>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [showSmsKey, setShowSmsKey] = useState(false);
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);

  const { data: configs = [], isLoading } = useGenericQuery<SystemConfig[]>('admin/config', companyId ?? undefined);

  useEffect(() => {
    if (Array.isArray(configs) && configs.length > 0) {
      setConfig(configs[0]);
    }
  }, [configs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setConfig((prev: any) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setConfig((prev: any) => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (id: string, checked: boolean) => {
    setConfig((prev: any) => ({ ...prev, [id]: checked }));
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setConfig((prev: any) => ({ ...prev, [id]: parseInt(value) || 0 }));
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = { ...config, companyId };
      if (config.id) {
        await api.put(`/admin/config/${config.id}`, payload);
      } else {
        await api.post('/admin/config', payload);
      }
      queryClient.invalidateQueries({ queryKey: ['admin/config', companyId] });
      toast({
        title: "Settings Saved",
        description: "Your system configuration has been updated.",
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Error",
        description: error.response?.data?.message || "Failed to save configuration",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (companyId && isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><LoadingSpinner text="Loading configuration..." /></div>;
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">System Configuration</h1>
              <p className="text-sm text-muted-foreground">Manage global settings for the application.</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
        <div className="h-0.5 mt-4 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general">
          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Global settings for all companies.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="appName">Application Name</Label>
                <Input id="appName" value={config.appName} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <Select value={config.defaultCurrency} onValueChange={(value) => handleSelectChange('defaultCurrency', value)}>
                  <SelectTrigger id="defaultCurrency" className="w-[280px]">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle>Billing & Invoice Settings</CardTitle>
              <CardDescription>Configure how billing and invoicing works across the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h4 className="font-medium">Auto-Suspend Overdue Subscribers</h4>
                  <p className="text-sm text-muted-foreground">Automatically suspend subscribers after their due date.</p>
                </div>
                <Switch id="autoSuspend" checked={config.autoSuspend} onCheckedChange={(checked) => handleSwitchChange('autoSuspend', checked)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gracePeriod">Grace Period (Days)</Label>
                <Input id="gracePeriod" type="number" value={config.gracePeriod} onChange={handleNumberInputChange} className="w-[180px]" />
                <p className="text-sm text-muted-foreground">Number of days after due date before suspension.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceTemplate">Invoice Template (Default)</Label>
                <Textarea id="invoiceTemplate" placeholder="Invoice footer text, terms and conditions..." rows={5} value={config.invoiceTemplate} onChange={handleInputChange} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure SMS, WhatsApp, and email templates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="smsGateway">SMS Gateway API Key</Label>
                <div className="relative">
                  <Input 
                    id="smsGateway" 
                    type={showSmsKey ? "text" : "password"} 
                    placeholder="**************" 
                    value={config.smsGateway} 
                    onChange={handleInputChange} 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmsKey(!showSmsKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showSmsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsAppGateway">WhatsApp Gateway Token</Label>
                <div className="relative">
                  <Input 
                    id="whatsAppGateway" 
                    type={showWhatsAppToken ? "text" : "password"} 
                    placeholder="**************" 
                    value={config.whatsAppGateway} 
                    onChange={handleInputChange} 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppToken(!showWhatsAppToken)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showWhatsAppToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceSms">Invoice Generation SMS Template</Label>
                <Textarea id="invoiceSms" value={config.invoiceSms} onChange={handleInputChange} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage application-wide security policies.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h4 className="font-medium">Enable Two-Factor Authentication (2FA)</h4>
                  <p className="text-sm text-muted-foreground">Require all users to set up 2FA for enhanced security.</p>
                </div>
                <Switch id="enable2fa" checked={config.enable2fa} onCheckedChange={(checked) => handleSwitchChange('enable2fa', checked)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (Minutes)</Label>
                <Input id="sessionTimeout" type="number" value={config.sessionTimeout} onChange={handleNumberInputChange} className="w-[180px]" />
                <p className="text-sm text-muted-foreground">Automatically log out users after a period of inactivity.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
