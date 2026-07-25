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
import type { InstallmentPlan } from '@/lib/types';
import { installmentPlanSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

type PlanFormValues = z.infer<typeof installmentPlanSchema>;

interface InstallmentPlanFormProps {
  plan: InstallmentPlan | null;
  onSave: (data: PlanFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function InstallmentPlanForm({ plan, onSave, onCancel, isSaving }: InstallmentPlanFormProps) {
  const defaultValues = plan
    ? {
        name: plan.name || '',
        installments: plan.installments || 1,
        percentageIncrease: Number(plan.percentageIncrease) || 0,
      }
    : {
        name: '',
        installments: 1,
        percentageIncrease: 0,
      };

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(installmentPlanSchema),
    defaultValues,
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
                <Input placeholder="e.g., 6-Month Easy Plan" {...field} />
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
        <FormField
          control={form.control}
          name="percentageIncrease"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Percentage Increase (%)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
