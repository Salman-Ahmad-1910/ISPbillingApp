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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { LedgerEntry } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const ledgerFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0, "Amount must be non-negative"),
  isCredit: z.boolean(),
}).refine(data => data.amount > 0, {
    message: 'Amount must be greater than 0',
    path: ['amount'],
});

type LedgerEntryFormValues = z.infer<typeof ledgerFormSchema>;

interface LedgerEntryFormProps {
  entry: Omit<LedgerEntry, 'balance' | 'companyId'> | null;
  onSave: (data: LedgerEntryFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function LedgerEntryForm({ entry, onSave, onCancel, isSaving }: LedgerEntryFormProps) {
  const form = useForm<LedgerEntryFormValues>({
    resolver: zodResolver(ledgerFormSchema),
    defaultValues: entry ? {
        date: entry.date,
        description: entry.description,
        amount: entry.debit > 0 ? entry.debit : entry.credit,
        isCredit: entry.credit > 0,
    } : {
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      isCredit: false,
    },
  });

  function onSubmit(values: LedgerEntryFormValues) {
    // Convert back to debit/credit format for the backend
    const backendData = {
      date: values.date,
      description: values.description,
      debit: values.isCredit ? 0 : values.amount,
      credit: values.isCredit ? values.amount : 0,
    };
    onSave(backendData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Details about the transaction..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    {...field} 
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isCredit"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Credit Transaction
                  </FormLabel>
                  <div className="text-sm text-muted-foreground">
                    {field.value 
                      ? "This is a credit transaction (money coming in)" 
                      : "This is a debit transaction (money going out)"
                    }
                  </div>
                </div>
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
