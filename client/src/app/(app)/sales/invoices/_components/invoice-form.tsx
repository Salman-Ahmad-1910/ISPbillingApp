'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubscriberSelect } from '@/components/ui/subscriber-select';
import type { Invoice, Subscriber, Package } from '@/lib/types';
import { invoiceSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoice: Invoice | null;
  subscribers: Subscriber[];
  packages: Package[];
  onSave: (data: InvoiceFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

// Build form defaults for a given invoice (or null for a new invoice).
// Provides an explicit value for EVERY schema field so no input starts
// undefined (which would trigger an uncontrolled->controlled warning).
function getInvoiceDefaults(invoice: Invoice | null): InvoiceFormValues {
  if (invoice) {
    return {
      id: invoice.id,
      subscriberId: invoice.subscriberId ?? '',
      packageId: invoice.packageId ?? '',
      packageName: invoice.packageName ?? '',
      packagePrice: invoice.packagePrice ?? 0,
      amount: Number(invoice.amount) || 0,
      taxAmount: invoice.taxAmount ?? 0,
      totalAmount: invoice.totalAmount ?? 0,
      notes: invoice.notes ?? '',
      status: invoice.status ?? 'pending',
      billingPeriod: invoice.billingPeriod ?? '',
      billingPeriodStart: invoice.billingPeriodStart ?? '',
      billingPeriodEnd: invoice.billingPeriodEnd ?? '',
      invoiceDate: invoice.invoiceDate ?? '',
      dueDate: invoice.dueDate ?? '',
    };
  }
  return {
    subscriberId: '',
    packageId: '',
    packageName: '',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    invoiceDate: new Date().toISOString().split('T')[0],
    billingPeriod: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
    billingPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    billingPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    status: 'pending',
    notes: '',
    taxAmount: 0,
    totalAmount: 0,
  };
}

export function InvoiceForm({ invoice, subscribers, packages, onSave, onCancel, isSaving }: InvoiceFormProps) {
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: getInvoiceDefaults(invoice),
  });

  // defaultValues only apply on first mount. When the dialog reuses this
  // component for a different invoice (null -> invoice, or invoice A -> B),
  // re-seed the form so subscriber/package/etc. reflect the new invoice.
  useEffect(() => {
    form.reset(getInvoiceDefaults(invoice));
  }, [invoice]);

  const selectedSubscriberId = useWatch({ control: form.control, name: 'subscriberId' });
  const selectedPackageId = useWatch({ control: form.control, name: 'packageId' });
  const amount = useWatch({ control: form.control, name: 'amount' });

  // Normalize props to arrays so .length/.find/.map never throw.
  const safeSubscribers = Array.isArray(subscribers) ? subscribers : [];
  const safePackages = Array.isArray(packages) ? packages : [];

  // Auto-calculate tax and total when amount changes
  useEffect(() => {
    const taxAmount = Math.round(Number(amount || 0) * 0.195); // 19.5% GST
    const totalAmount = Number(amount || 0) + taxAmount;
    form.setValue('taxAmount', taxAmount);
    form.setValue('totalAmount', totalAmount);
  }, [amount]);

  // Auto-fill package details when package is manually selected (new invoices only)
  useEffect(() => {
    if (invoice) return;
    if (selectedPackageId && safePackages.length > 0) {
      const selectedPackage = safePackages.find(pkg => pkg.id === selectedPackageId);
      if (selectedPackage) {
        form.setValue('packageName', selectedPackage.name);
        form.setValue('packagePrice', selectedPackage.price);
        form.setValue('amount', selectedPackage.price);
      }
    }
  }, [selectedPackageId, safePackages, invoice]);

  // Sync package details from the selected subscriber. Runs for both new and
  // edit modes: on edit the backend invoice doesn't store packageId, so we
  // resolve it from the subscriber so the package dropdown pre-selects.
  useEffect(() => {
    if (!selectedSubscriberId || safeSubscribers.length === 0) return;
    const selectedSubscriber = safeSubscribers.find(sub => sub.id === selectedSubscriberId);
    if (selectedSubscriber) {
      form.setValue('packageId', selectedSubscriber.packageId ?? '');
      form.setValue('packageName', selectedSubscriber.packageName ?? '');
    }
  }, [selectedSubscriberId, safeSubscribers]);

  function onSubmit(values: InvoiceFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="subscriberId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subscriber</FormLabel>
              <FormControl>
                <SubscriberSelect
                  subscribers={safeSubscribers}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Search by subscriber ID or name..."
                  // disabled={!!invoice}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="packageId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Package</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange} disabled={!!invoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                  <SelectContent>
                    {safePackages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - PKR {pkg.price.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="billingPeriod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Period</FormLabel>
              <FormControl>
                <Input placeholder="e.g., July 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="billingPeriodStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Period Start</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="billingPeriodEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Period End</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
            control={form.control}
            name="invoiceDate"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Invoice Date</FormLabel>
                <FormControl>
                    <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                    <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Amount (PKR)</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="taxAmount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tax Amount (PKR)</FormLabel>
                <FormControl>
                    <Input type="number" {...field} readOnly />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <div className="grid grid-cols-1 gap-3">
            <FormField
            control={form.control}
            name="totalAmount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Total Amount (PKR)</FormLabel>
                <FormControl>
                    <Input type="number" {...field} readOnly className="bg-muted" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Input placeholder="Add any additional notes..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Invoice'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
