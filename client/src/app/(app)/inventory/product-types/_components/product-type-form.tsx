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
import type { ProductType } from '@/lib/types';
import { productTypeSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

type ProductTypeFormValues = z.infer<typeof productTypeSchema>;

interface ProductTypeFormProps {
  productType: ProductType | null;
  onSave: (data: ProductTypeFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ProductTypeForm({ productType, onSave, onCancel, isSaving }: ProductTypeFormProps) {
  const form = useForm<ProductTypeFormValues>({
    resolver: zodResolver(productTypeSchema),
    defaultValues: productType ? {
        ...productType,
    } : {
      name: '',
    },
  });

  function onSubmit(values: ProductTypeFormValues) {
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
              <FormLabel>Product Type Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Raw Material" {...field} />
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
            {isSaving ? 'Saving...' : 'Save Product Type'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
