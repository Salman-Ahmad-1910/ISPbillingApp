'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function RechargeEnginePage() {
  return (
    <>
      <PageHeader
        title="Recharge Engine"
        description="Configure the core automated billing and suspension system."
      >
        <Button>Save Changes</Button>
      </PageHeader>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Automated Billing</CardTitle>
            <CardDescription>Settings for automatic monthly invoice generation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                    <h4 className="font-medium">Enable Auto-Billing</h4>
                    <p className="text-sm text-muted-foreground">Automatically generate invoices for all active subscribers each month.</p>
                </div>
                <Switch defaultChecked />
            </div>
            <div className="space-y-2 max-w-sm">
                <Label htmlFor="billing-day">Billing Day of Month</Label>
                <Input id="billing-day" type="number" defaultValue="1" />
                <p className="text-sm text-muted-foreground">The day of the month when invoices should be generated (e.g., 1 for the 1st).</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suspension Rules</CardTitle>
            <CardDescription>Rules for automatically suspending overdue subscribers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                    <h4 className="font-medium">Enable Auto-Suspension</h4>
                    <p className="text-sm text-muted-foreground">Automatically suspend subscribers who fail to pay their bill on time.</p>
                </div>
                <Switch defaultChecked />
            </div>
            <div className="space-y-2 max-w-sm">
                <Label htmlFor="grace-period">Grace Period (in days)</Label>
                <Input id="grace-period" type="number" defaultValue="5" />
                <p className="text-sm text-muted-foreground">Number of days after the due date before an account is suspended.</p>
            </div>
             <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                    <h4 className="font-medium">Minimum Overdue Amount for Suspension</h4>
                    <p className="text-sm text-muted-foreground">Only suspend if the overdue amount is greater than this value.</p>
                </div>
                <Input type="number" defaultValue="100" className="w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
