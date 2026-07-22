'use client';

import { useEffect } from 'react';
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
import type { DistributionBox } from '@/lib/types';
import { distributionBoxSchema } from '@/lib/schemas';

type BoxFormValues = z.infer<typeof distributionBoxSchema>;

interface BoxFormProps {
  box: DistributionBox | null;
  onSave: (data: BoxFormValues) => void;
  onCancel: () => void;
}

export function BoxForm({ box, onSave, onCancel }: BoxFormProps) {
  const getDefaultValues = (boxData: DistributionBox | null) => {
    if (!boxData) {
      return { name: '' };
    }
    return {
      id: boxData.id,
      name: boxData.name || '',
      companyId: boxData.companyId,
    };
  };

  const form = useForm<BoxFormValues>({
    resolver: zodResolver(distributionBoxSchema),
    defaultValues: getDefaultValues(box),
  });

  useEffect(() => {
    form.reset(getDefaultValues(box));
  }, [box, form]);

  function onSubmit(values: BoxFormValues) {
    onSave(values);
  }

  function onError(errors: any) {
    console.error("Box Form Validation Errors:", errors);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Box / Media Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., BX-001" {...field} className="border-muted-foreground/20" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:hover:bg-rose-950/30 transition-all duration-300">
            Cancel
          </Button>
          <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md">
            {box ? 'Save' : 'Add'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
