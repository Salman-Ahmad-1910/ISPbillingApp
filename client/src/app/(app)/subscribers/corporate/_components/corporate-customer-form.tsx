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
import type { CorporateCustomer } from '@/lib/types';
import { corporateCustomerSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

type CorporateCustomerFormValues = z.infer<typeof corporateCustomerSchema>;

interface CorporateCustomerFormProps {
  customer: CorporateCustomer | null;
  onSave: (data: CorporateCustomerFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function CorporateCustomerForm({ customer, onSave, onCancel, isSaving }: CorporateCustomerFormProps) {
  const form = useForm<CorporateCustomerFormValues>({
    resolver: zodResolver(corporateCustomerSchema),
    defaultValues: customer || {
      companyName: '',
      contactPerson: '',
      contactPhone: '',
      negotiatedPricing: '',
      contractStartDate: new Date().toISOString().split('T')[0],
      contractEndDate: '',
      totalConnections: 1,
    },
  });

  function onSubmit(values: CorporateCustomerFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Acme Corp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Contact Phone</FormLabel>
                <FormControl>
                    <Input type="tel" placeholder="e.g., 0300-1234567" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
             <FormField
            control={form.control}
            name="contractStartDate"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Contract Start Date</FormLabel>
                <FormControl>
                    <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="contractEndDate"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Contract End Date</FormLabel>
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
          name="totalConnections"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Connections</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

         <FormField
          control={form.control}
          name="negotiatedPricing"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pricing Details (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Flat 10% discount on all services" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Client'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
