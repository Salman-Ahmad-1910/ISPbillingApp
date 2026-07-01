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
import type { Brand } from '@/lib/types';
import { brandSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

type BrandFormValues = z.infer<typeof brandSchema>;

interface BrandFormProps {
  brand: Brand | null;
  onSave: (data: BrandFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function BrandForm({ brand, onSave, onCancel, isSaving }: BrandFormProps) {
  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: brand ? {
      name: brand.name,
    } : {
      name: '',
    },
  });

  function onSubmit(values: BrandFormValues) {
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
              <FormLabel>Brand Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., TP-Link, Huawei" {...field} />
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
            {isSaving ? 'Saving...' : 'Add'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
