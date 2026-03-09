'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import { useQueryClient } from '@tanstack/react-query';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import api from '@/lib/api';
import { Loader2, Plus } from 'lucide-react';
import type { AlertTemplate } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';



const defaultAlerts = [
  {
    templateId: 'invoice-generated',
    title: 'Invoice Generated',
    description: 'Sent when a new invoice is created.',
    smsEnabled: true,
    smsTemplate: 'Dear {customer_name}, your bill of PKR {amount} for {billing_period} is due on {due_date}. Thank you, {company_name}.',
    whatsAppEnabled: true,
    whatsAppTemplate: '*Invoice Alert* 🧾 %0ADear {customer_name},%0A%0AYour new invoice for *{billing_period}* is now available.%0A*Amount Due:* PKR {amount}%0A*Due Date:* {due_date}%0A%0APay now to avoid service interruption.%0A%0AThank you,%0A*{company_name}*',
  },
  {
    templateId: 'payment-received',
    title: 'Payment Received',
    description: 'Sent when a payment is successfully recorded.',
    smsEnabled: true,
    smsTemplate: 'Thank you for your payment of PKR {amount}. Your account is updated. Transaction ID: {payment_id}. {company_name}.',
    whatsAppEnabled: false,
    whatsAppTemplate: '*Payment Confirmation* ✅ %0ADear {customer_name},%0A%0AWe have received your payment of *PKR {amount}*.%0AThank you for being a valued customer.%0A%0A*{company_name}*',
  },
  {
    templateId: 'due-date-reminder',
    title: 'Due Date Reminder',
    description: 'Sent a few days before the invoice due date.',
    smsEnabled: false,
    smsTemplate: 'Gentle Reminder: Your payment of PKR {amount} is due on {due_date}. Please pay to avoid suspension. {company_name}.',
    whatsAppEnabled: true,
    whatsAppTemplate: '*Payment Reminder* ❗ %0ADear {customer_name},%0A%0AThis is a friendly reminder that your payment of *PKR {amount}* is due on *{due_date}*.%0A%0APlease make the payment to ensure uninterrupted service.%0A%0AThank you,%0A*{company_name}*',
  },
  {
    templateId: 'account-suspension',
    title: 'Account Suspension',
    description: 'Sent when a subscriber\'s account is suspended.',
    smsEnabled: true,
    smsTemplate: 'Your account has been suspended due to non-payment. Please clear your dues of PKR {balance} to restore services. {company_name}.',
    whatsAppEnabled: false,
    whatsAppTemplate: '*Account Suspended* 🚫 %0ADear {customer_name},%0A%0AYour account has been temporarily suspended due to an outstanding balance of *PKR {balance}*.%0A%0APlease clear your dues at your earliest convenience to restore your services.%0A%0AThank you,%0A*{company_name}*',
  },
];

export default function AlertsPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [alerts, setAlerts] = useState<AlertTemplate[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState<Partial<AlertTemplate>>({
    title: '',
    description: '',
    templateId: '',
    smsEnabled: true,
    smsTemplate: '',
    whatsAppEnabled: false,
    whatsAppTemplate: '',
  });

  const { data: fetchedAlerts, isLoading } = useGenericQuery<AlertTemplate[]>('support/alerts', companyId ?? undefined);

  useEffect(() => {
    console.log('Fetched alerts:', fetchedAlerts);
    if (fetchedAlerts && fetchedAlerts.length > 0) {
      console.log('Setting alerts:', fetchedAlerts);
      setAlerts(fetchedAlerts);
    }
  }, [fetchedAlerts]);

  const handleTemplateChange = (
    alertId: string,
    channel: 'sms' | 'whatsapp',
    field: 'enabled' | 'template',
    value: string | boolean
  ) => {
    console.log('Template change:', { alertId, channel, field, value });
    setAlerts(currentAlerts =>
      currentAlerts.map(alert => {
        // Match by either id or templateId for compatibility
        if (alert.id === alertId || alert.templateId === alertId) {
          const channelKey = channel === 'sms' ? 'smsEnabled' : 'whatsAppEnabled';
          const templateKey = channel === 'sms' ? 'smsTemplate' : 'whatsAppTemplate';
          const updatedAlert = {
            ...alert,
            [field === 'enabled' ? channelKey : templateKey]: value,
          };
          console.log('Updated alert:', updatedAlert);
          return updatedAlert;
        }
        return alert;
      })
    );
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Filter out alerts without IDs and ensure all have proper IDs
      const validAlerts = alerts.filter(alert => alert.id && alert.id !== 'undefined');
      console.log('Saving alerts:', validAlerts);
      
      // Save all modified alerts
      await Promise.all(validAlerts.map(alert => api.put(`/support/alerts/${alert.id}`, alert)));

      queryClient.invalidateQueries({ queryKey: ['support/alerts', companyId] });
      toast({
        title: 'Templates Saved',
        description: 'Your alert templates have been updated successfully.',
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save alert templates',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const initializeTemplates = async () => {
    setIsSaving(true);
    try {
      const responses = await Promise.all(defaultAlerts.map(alert => api.post('/support/alerts', { ...alert, companyId: companyId! })));
      const createdAlerts = responses.map(response => response.data); // API returns data directly
      console.log('Initialized alerts:', createdAlerts);
      
      setAlerts(createdAlerts);
      queryClient.invalidateQueries({ queryKey: ['support/alerts', companyId] });
      toast({ title: 'Success', description: 'Default templates initialized.' });
    } catch (error: any) {
      console.error('Initialize error:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to initialize templates' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!newAlert.title || !newAlert.templateId) {
      toast({ title: 'Error', description: 'Title and Template ID are required.' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.post('/support/alerts', { ...newAlert, companyId: companyId! });
      const createdAlert = response.data; // API returns data directly
      console.log('Created alert:', createdAlert);
      
      setAlerts([...alerts, createdAlert]);
      setNewAlert({
        title: '',
        description: '',
        templateId: '',
        smsEnabled: true,
        smsTemplate: '',
        whatsAppEnabled: false,
        whatsAppTemplate: '',
      });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['support/alerts', companyId] });
      toast({ title: 'Success', description: 'New alert template created.' });
    } catch (error: any) {
      console.error('Create error:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to create alert template' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <PageHeader
        title="Custom Alerts & Notifications"
        description="Set up automated WhatsApp and SMS alerts."
      >
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Custom Alert Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-id">Template ID</Label>
                  <Input
                    id="template-id"
                    placeholder="e.g., custom-alert"
                    value={newAlert.templateId || ''}
                    onChange={(e) => setNewAlert({ ...newAlert, templateId: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="alert-title">Title</Label>
                  <Input
                    id="alert-title"
                    placeholder="e.g., Custom Alert"
                    value={newAlert.title || ''}
                    onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="alert-description">Description</Label>
                  <Input
                    id="alert-description"
                    placeholder="Describe when this alert is sent"
                    value={newAlert.description || ''}
                    onChange={(e) => setNewAlert({ ...newAlert, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-sms-switch">SMS</Label>
                  <Switch
                    id="new-sms-switch"
                    checked={newAlert.smsEnabled}
                    onCheckedChange={(checked) => setNewAlert({ ...newAlert, smsEnabled: checked })}
                  />
                </div>
                <Textarea
                  placeholder="SMS template"
                  value={newAlert.smsTemplate || ''}
                  onChange={(e) => setNewAlert({ ...newAlert, smsTemplate: e.target.value })}
                  disabled={!newAlert.smsEnabled}
                />
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-whatsapp-switch">WhatsApp</Label>
                  <Switch
                    id="new-whatsapp-switch"
                    checked={newAlert.whatsAppEnabled}
                    onCheckedChange={(checked) => setNewAlert({ ...newAlert, whatsAppEnabled: checked })}
                  />
                </div>
                <Textarea
                  placeholder="WhatsApp template"
                  value={newAlert.whatsAppTemplate || ''}
                  onChange={(e) => setNewAlert({ ...newAlert, whatsAppTemplate: e.target.value })}
                  disabled={!newAlert.whatsAppEnabled}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAlert} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Alert
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {alerts.length === 0 && (
            <Button variant="outline" onClick={initializeTemplates} disabled={isSaving}>
              Initialize Defaults
            </Button>
          )}
          <Button onClick={handleSaveChanges} disabled={isSaving || alerts.length === 0}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </PageHeader>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No alert templates found. Click "Initialize Defaults" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {alerts.map((alert) => (
            <Card key={alert.id || alert.templateId || Math.random().toString()}>
              <CardHeader>
                <CardTitle>{alert.title}</CardTitle>
                <CardDescription>{alert.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${alert.id || alert.templateId || 'alert'}-sms-switch`}>SMS</Label>
                  <Switch
                    id={`${alert.id || alert.templateId || 'alert'}-sms-switch`}
                    checked={alert.smsEnabled}
                    onCheckedChange={(checked) => handleTemplateChange(alert.id || alert.templateId!, 'sms', 'enabled', checked)}
                  />
                </div>
                <Textarea
                  placeholder="SMS template"
                  value={alert.smsTemplate}
                  onChange={(e) => handleTemplateChange(alert.id || alert.templateId!, 'sms', 'template', e.target.value)}
                  disabled={!alert.smsEnabled}
                />
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${alert.id || alert.templateId || 'alert'}-whatsapp-switch`}>WhatsApp</Label>
                  <Switch
                    id={`${alert.id || alert.templateId || 'alert'}-whatsapp-switch`}
                    checked={alert.whatsAppEnabled}
                    onCheckedChange={(checked) => handleTemplateChange(alert.id || alert.templateId!, 'whatsapp', 'enabled', checked)}
                  />
                </div>
                <Textarea
                  placeholder="WhatsApp template"
                  value={alert.whatsAppTemplate}
                  onChange={(e) => handleTemplateChange(alert.id || alert.templateId!, 'whatsapp', 'template', e.target.value)}
                  disabled={!alert.whatsAppEnabled}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
