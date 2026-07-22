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
import type { UnitType } from '@/lib/types';
import { unitTypeSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

type UnitTypeFormValues = z.infer<typeof unitTypeSchema>;

interface UnitTypeFormProps {
  unitType: UnitType | null;
  onSave: (data: UnitTypeFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function UnitTypeForm({ unitType, onSave, onCancel, isSaving }: UnitTypeFormProps) {
  const form = useForm<UnitTypeFormValues>({
    resolver: zodResolver(unitTypeSchema),
    defaultValues: unitType ? {
      name: unitType.name,
    } : {
      name: '',
    },
  });

  function onSubmit(values: UnitTypeFormValues) {
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
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., piece" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
