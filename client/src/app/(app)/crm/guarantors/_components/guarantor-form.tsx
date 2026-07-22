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
import type { Guarantor, Customer } from '@/lib/types';
import { guarantorSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

type GuarantorFormValues = z.infer<typeof guarantorSchema>;

interface GuarantorFormProps {
  guarantor: Guarantor | null;
  customers: Customer[];
  onSave: (data: GuarantorFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function GuarantorForm({ guarantor, customers, onSave, onCancel, isSaving }: GuarantorFormProps) {
  const form = useForm<GuarantorFormValues>({
    resolver: zodResolver(guarantorSchema),
    defaultValues: guarantor || {
      name: '',
      cnic: '',
      phone: '',
      customerId: '',
    },
  });

  function onSubmit(values: GuarantorFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guarantor Name</FormLabel>
              <FormControl>
                <Input className="border-muted-foreground/20" placeholder="e.g., John Smith" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="cnic"
            render={({ field }) => (
                <FormItem>
                <FormLabel>CNIC</FormLabel>
                <FormControl>
                    <Input className="border-muted-foreground/20" placeholder="e.g., 42201-8765432-1" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                    <Input className="border-muted-foreground/20" placeholder="e.g., 0321-1234567" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer to Guarantee</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger className="border-muted-foreground/20">
                        <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving} className="border-rose-200 text-rose-600 hover:bg-rose-50">
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105 disabled:hover:scale-100">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Guarantor'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
