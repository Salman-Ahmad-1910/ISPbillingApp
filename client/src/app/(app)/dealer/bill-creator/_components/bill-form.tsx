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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CustomBill, Subscriber } from '@/lib/types';
import { customBillSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

type BillFormValues = z.infer<typeof customBillSchema>;

interface BillFormProps {
  bill: CustomBill | null;
  subscribers: Subscriber[];
  onSave: (data: BillFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function BillForm({ bill, subscribers, onSave, onCancel, isSaving }: BillFormProps) {
  const form = useForm<BillFormValues>({
    resolver: zodResolver(customBillSchema),
    defaultValues: bill ? {
        ...bill,
    } : {
      subscriberId: '',
      amount: 0,
      description: '',
      status: 'pending',
    },
  });

  function onSubmit(values: BillFormValues) {
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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!bill}>
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
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (PKR)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Enter bill amount" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
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
                <Textarea placeholder="e.g., Late payment fee" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {bill && (
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
                            </SelectContent>
                        </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Bill'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
