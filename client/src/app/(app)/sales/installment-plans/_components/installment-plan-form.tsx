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
import type { InstallmentPlan, Product } from '@/lib/types';
import { installmentPlanSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

type PlanFormValues = z.infer<typeof installmentPlanSchema>;

interface InstallmentPlanFormProps {
  plan: InstallmentPlan | null;
  products: Product[];
  onSave: (data: PlanFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function InstallmentPlanForm({ plan, products, onSave, onCancel, isSaving }: InstallmentPlanFormProps) {
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(installmentPlanSchema),
    defaultValues: plan || {
      name: '',
      productId: '',
      downPayment: 0,
      installments: 1,
      installmentAmount: 0,
    },
  });

  const { watch, setValue } = form;
  const downPayment = watch('downPayment');
  const installments = watch('installments');
  const installmentAmount = watch('installmentAmount');

  const totalAmount = (downPayment || 0) + (installments || 0) * (installmentAmount || 0);

  function onSubmit(values: PlanFormValues) {
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
              <FormLabel>Plan Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 6-Month Easy Plan" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="downPayment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Down Payment (PKR)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="installments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Installments</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="installmentAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Installment Amount (PKR)</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div>
            <FormLabel>Total Amount</FormLabel>
            <Input value={totalAmount.toLocaleString()} readOnly className="mt-2 bg-muted font-medium" />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Plan'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
