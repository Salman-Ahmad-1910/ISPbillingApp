'use client';

import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Gem } from 'lucide-react';

export default function SubscriptionPage() {
  return (
    <>
      <PageHeader
        title="Subscription & Billing"
        description="Manage your subscription plan and payment methods."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gem className="h-6 w-6 text-primary" />
            Manage Subscription
          </CardTitle>
          <CardDescription>
            This feature is under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The full functionality for managing your SaaS subscription will be
            implemented soon. You will be able to upgrade, downgrade, and manage
            your payment details here.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
