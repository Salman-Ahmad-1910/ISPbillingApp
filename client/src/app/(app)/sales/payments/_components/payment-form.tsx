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
import type { Payment, Subscriber, Invoice } from '@/lib/types';
import { paymentSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  payment: Payment | null;
  subscribers: Subscriber[];
  invoices: Invoice[];
  onSave: (data: PaymentFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function PaymentForm({ payment, subscribers, invoices, onSave, onCancel, isSaving }: PaymentFormProps) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: payment ? {
      id: payment.id,
      invoiceId: payment.invoiceId,
      subscriberId: payment.subscriberId,
      amount: Number(payment.amount),
      paymentDate: payment.paymentDate,
      method: payment.method,
      collectorId: payment.collectorId || null,
    } : {
      invoiceId: '',
      subscriberId: '',
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'cash',
    },
  });

  // Reactive subscriber id so the invoice list and disabled state update on selection.
  const selectedSubscriberId = useWatch({ control: form.control, name: 'subscriberId' });
  const subscriberInvoices = invoices.filter(
    (inv) => !selectedSubscriberId || inv.subscriberId === selectedSubscriberId
  );

  function onSubmit(values: PaymentFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  disabled={!!payment}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="invoiceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!selectedSubscriberId || subscriberInvoices.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedSubscriberId
                        ? 'Select a subscriber first'
                        : subscriberInvoices.length === 0
                          ? 'No invoices for this subscriber'
                          : 'Select an invoice'
                    } />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subscriberInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.id} - {invoice.billingPeriod} - PKR {invoice.amount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (PKR)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payment method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="dealer">Dealer</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Payment'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
