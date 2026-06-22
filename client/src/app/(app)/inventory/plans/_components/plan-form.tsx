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
import type { pricingPlans as Plan } from '@/lib/types';
import { pricingPlanSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

type PlanFormValues = z.infer<typeof pricingPlanSchema>;

interface PlanFormProps {
  plan: Plan | null;
  onSave: (data: PlanFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function PlanForm({ plan, onSave, onCancel, isSaving }: PlanFormProps) {
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(pricingPlanSchema),
    defaultValues: plan ? {
      ...plan,
      price: Number(plan.price),
      features: typeof plan.features === 'string'
        ? plan.features.replaceAll(',', '\n')
        : (Array.isArray(plan.features) ? plan.features.join('\n') : ''),
    } : {
      name: '',
      price: 0,
      features: '',
    },
  });

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
                <Input placeholder="e.g., Basic, Pro, Enterprise" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (PKR per month)</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="features"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Features</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter one feature per line..." {...field} rows={5} />
              </FormControl>
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
            {isSaving ? 'Saving...' : 'Save Plan'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
