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
import type { Area } from '@/lib/types';
import { areaSchema } from '@/lib/schemas';

type AreaFormValues = z.infer<typeof areaSchema>;

interface AreaFormProps {
  area: Area | null;
  onSave: (data: AreaFormValues) => void;
  onCancel: () => void;
}

export function AreaForm({ area, onSave, onCancel }: AreaFormProps) {
  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaSchema),
    defaultValues: area || {
      city: '',
      zone: '',
      locality: '',
      subLocality: '',
    },
  });

  function onSubmit(values: AreaFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Karachi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="zone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Zone</FormLabel>
              <FormControl>
                <Input placeholder="e.g., South" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="locality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Locality</FormLabel>
              <FormControl>
                <Input placeholder="e.g., DHA Phase 6" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subLocality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub-Locality (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Street 1-10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Area</Button>
        </div>
      </form>
    </Form>
  );
}
