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
import type { OLT } from '@/lib/types';
import { oltSchema } from '@/lib/schemas';

type OLTFormValues = z.infer<typeof oltSchema>;

interface OLTFormProps {
  olt: OLT | null;
  onSave: (data: OLTFormValues) => void;
  onCancel: () => void;
}

export function OLTForm({ olt, onSave, onCancel }: OLTFormProps) {
  const form = useForm<OLTFormValues>({
    resolver: zodResolver(oltSchema),
    defaultValues: olt || {
      name: '',
      location: '',
      ipAddress: '',
      ports: 16,
    },
  });

  function onSubmit(values: OLTFormValues) {
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
              <FormLabel>OLT Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., DHA-OLT-1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g., DHA Phase 6 PoP" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="ipAddress"
            render={({ field }) => (
                <FormItem>
                <FormLabel>IP Address</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., 10.10.1.1" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
              <FormField
            control={form.control}
            name="ports"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Total Ports</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save OLT</Button>
        </div>
      </form>
    </Form>
  );
}
