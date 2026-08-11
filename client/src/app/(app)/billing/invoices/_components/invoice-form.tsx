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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search } from 'lucide-react';
import type { Invoice, Subscriber } from '@/lib/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const invoiceFormSchema = z.object({
  subscriberId: z.string().min(1, 'Subscriber is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  dueDate: z.string().min(1, 'Due date is required'),
  billingMonth: z.string().min(1, 'Billing month is required'),
  billingYear: z.string().min(1, 'Billing year is required'),
  status: z.string(),
  batch: z.string().optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  invoice: Invoice | null;
  subscribers: Subscriber[];
  onSave: (data: InvoiceFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

function getCurrentMonthYear(): { month: string; year: string } {
  const now = new Date();
  return { month: MONTHS[now.getMonth()], year: String(now.getFullYear()) };
}

function parseBillingPeriod(period?: string): { month: string; year: string } {
  const fallback = getCurrentMonthYear();
  if (!period) return fallback;
  const match = period.match(/^(\w+)\s+(\d{4})$/);
  if (match && MONTHS.includes(match[1])) {
    return { month: match[1], year: match[2] };
  }
  return fallback;
}

export function InvoiceForm({ invoice, subscribers, onSave, onCancel, isSaving }: InvoiceFormProps) {
  const initialPeriod = parseBillingPeriod(invoice?.billingPeriod);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      subscriberId: invoice?.subscriberId || '',
      amount: invoice?.amount || undefined,
      dueDate: invoice?.dueDate ? invoice.dueDate.slice(0, 10) : '',
      billingMonth: invoice ? initialPeriod.month : getCurrentMonthYear().month,
      billingYear: invoice ? initialPeriod.year : getCurrentMonthYear().year,
      status: invoice?.status || 'pending',
      batch: invoice?.batch || '',
    },
  });

  const selectedSubscriberId = form.watch('subscriberId');
  const selectedSubscriber = subscribers.find(s => s.id === selectedSubscriberId);

  function onSubmit(values: InvoiceFormValues) {
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
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger className="pl-8">
                      <SelectValue placeholder="Select a subscriber" />
                    </SelectTrigger>
                    <SelectContent>
                      {subscribers.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name} {sub.subscriber_identity ? `(${sub.subscriber_identity})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FormControl>
              {selectedSubscriber && (
                <p className="text-xs text-muted-foreground">
                  {selectedSubscriber.phone || selectedSubscriber.areaName || selectedSubscriber.packageName}
                </p>
              )}
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
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="e.g., 2500" {...field} />
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="billingMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Month</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
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
            name="billingYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Year</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - 2 + i)).map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="batch"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batch (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Monthly-2026-08" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : (invoice ? 'Update Invoice' : 'Create Invoice')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
