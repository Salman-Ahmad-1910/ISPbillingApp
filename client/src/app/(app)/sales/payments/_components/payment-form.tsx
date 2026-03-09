'use client';

import { useForm } from 'react-hook-form';
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
        ...payment,
        amount: Number(payment.amount),
    } : {
      invoiceId: '',
      subscriberId: '',
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'cash',
    },
  });

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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subscriber" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subscribers.map((subscriber) => (
                    <SelectItem key={subscriber.id} value={subscriber.id}>
                      {subscriber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!form.watch('subscriberId')}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an invoice" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {invoices.filter(inv => inv.subscriberId === form.watch('subscriberId')).map((invoice) => (
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
