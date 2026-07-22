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
import type { Package } from '@/lib/types';
import { packageSchema } from '@/lib/schemas';

interface PackageFormProps {
  pkg: Package | null;
  onSave: (data: Omit<Package, 'id' | 'companyId'>) => void;
  onCancel: () => void;
}

type PackageFormValues = z.infer<typeof packageSchema>;

export function PackageForm({ pkg, onSave, onCancel }: PackageFormProps) {
  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: pkg || {
      name: '',
      speed: '',
      price: 0,
      dataLimit: 'Unlimited',
    },
  });

  function onSubmit(values: PackageFormValues) {
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
              <FormLabel>Package Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Bronze" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="speed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Speed</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 10 Mbps" {...field} />
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
                <FormLabel>Price (PKR)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <FormField
          control={form.control}
          name="dataLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Limit</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Unlimited" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Package</Button>
        </div>
      </form>
    </Form>
  );
}
