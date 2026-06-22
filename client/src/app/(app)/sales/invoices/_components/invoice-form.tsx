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

export function InvoiceForm({ invoice, subscribers, packages, onSave, onCancel, isSaving }: InvoiceFormProps) {
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice ? {
        ...invoice,
        amount: Number(invoice.amount),
    } : {
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
    },
  });

  const selectedSubscriberId = useWatch({ control: form.control, name: 'subscriberId' });
  const selectedPackageId = useWatch({ control: form.control, name: 'packageId' });
  const amount = useWatch({ control: form.control, name: 'amount' });

  // Auto-calculate tax and total when amount changes
  useEffect(() => {
    const taxAmount = Math.round(amount * 0.195); // 19.5% GST
    const totalAmount = amount + taxAmount;
    form.setValue('taxAmount', taxAmount);
    form.setValue('totalAmount', totalAmount);
  }, [amount]);

  // Auto-fill package details when package is selected
  useEffect(() => {
    if (selectedPackageId && packages.length > 0) {
      const selectedPackage = packages.find(pkg => pkg.id === selectedPackageId);
      if (selectedPackage) {
        form.setValue('packageName', selectedPackage.name);
        form.setValue('packagePrice', selectedPackage.price);
        form.setValue('amount', selectedPackage.price);
      }
    }
  }, [selectedPackageId, packages]);

  // Auto-fill package details when subscriber is selected
  useEffect(() => {
    if (selectedSubscriberId && subscribers.length > 0) {
      const selectedSubscriber = subscribers.find(sub => sub.id === selectedSubscriberId);
      if (selectedSubscriber) {
        form.setValue('packageId', selectedSubscriber.packageId);
        form.setValue('packageName', selectedSubscriber.packageName);
      }
    }
  }, [selectedSubscriberId, subscribers]);

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
                  subscribers={subscribers}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Search by subscriber ID or name..."
                  disabled={!!invoice}
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
                    {packages.map((pkg) => (
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
