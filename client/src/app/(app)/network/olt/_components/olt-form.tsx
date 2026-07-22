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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OLT, POP } from '@/lib/types';
import { oltSchema } from '@/lib/schemas';

type OLTFormValues = z.infer<typeof oltSchema>;

interface OLTFormProps {
  olt: OLT | null;
  pops: POP[];
  onSave: (data: OLTFormValues) => void;
  onCancel: () => void;
}

export function OLTForm({ olt, pops, onSave, onCancel }: OLTFormProps) {
  const form = useForm<OLTFormValues>({
    resolver: zodResolver(oltSchema),
    defaultValues: olt || {
      name: '',
      location: '',
      ipAddress: '',
      ports: 16,
      popId: '',
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
                <Input placeholder="e.g., DHA-OLT-1" {...field} className="border-muted-foreground/20" />
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
                <Input placeholder="e.g., DHA Phase 6 PoP" {...field} className="border-muted-foreground/20" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="popId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>POP</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select POP" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {pops.map((pop) => (
                    <SelectItem key={pop.id} value={pop.id}>
                      {pop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <Input placeholder="e.g., 10.10.1.1" {...field} className="border-muted-foreground/20" />
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
                    <Input type="number" {...field} className="border-muted-foreground/20" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:hover:bg-rose-950/30 transition-all duration-300">
            Cancel
          </Button>
          <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md">
            Save OLT
          </Button>
        </div>
      </form>
    </Form>
  );
}
