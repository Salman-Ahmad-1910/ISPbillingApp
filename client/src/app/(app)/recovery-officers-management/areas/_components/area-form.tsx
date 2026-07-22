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
import type { Area } from '@/lib/types';
import { areaSchema } from '@/lib/schemas';

type AreaFormValues = z.infer<typeof areaSchema>;

interface AreaFormProps {
  area: Area | null;
  onSave: (data: AreaFormValues) => void;
  onCancel: () => void;
}

export function AreaForm({ area, onSave, onCancel }: AreaFormProps) {
  const getDefaultValues = (areaData: Area | null) => {
    if (!areaData) {
      return {
        city: '',
        zone: '',
        locality: '',
        subLocality: '',
      };
    }
    return {
      id: areaData.id,
      city: areaData.city || '',
      zone: areaData.zone || '',
      locality: areaData.locality || '',
      subLocality: areaData.subLocality || '',
      recoveryOfficerId: areaData.recoveryOfficerId,
      companyId: areaData.companyId,
    };
  };

  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaSchema),
    defaultValues: getDefaultValues(area),
  });

  useEffect(() => {
    form.reset(getDefaultValues(area));
  }, [area, form]);

  function onSubmit(values: AreaFormValues) {
    onSave(values);
  }

  function onError(errors: any) {
    console.error("Area Form Validation Errors:", errors);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
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
                <Input placeholder="e.g., Street 1-10" value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">Save Area</Button>
        </div>
      </form>
    </Form>
  );
}
