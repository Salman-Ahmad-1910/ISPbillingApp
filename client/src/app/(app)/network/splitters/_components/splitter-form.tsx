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
import type { Splitter } from '@/lib/types';
import { splitterSchema } from '@/lib/schemas';
import { useCompany } from '@/context/company-context';

import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type SplitterFormValues = z.infer<typeof splitterSchema>;

interface SplitterFormProps {
  splitter: Splitter | null;
  onSave: (data: SplitterFormValues) => void;
  onCancel: () => void;
}

export function SplitterForm({ splitter, onSave, onCancel }: SplitterFormProps) {
    const { companyId } = useCompany();

    const { data: olts = [], isLoading: isLoadingolts } = useGenericQuery<any>('network/olts', companyId ?? undefined);
  if (Object.keys({useGenericQuery}).length && typeof isLoading !== 'undefined' && isLoading) { return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>; }

  const form = useForm<SplitterFormValues>({
    resolver: zodResolver(splitterSchema),
    defaultValues: splitter || {
      name: '',
      location: '',
      oltId: '',
      totalPorts: 8,
      availablePorts: 8,
    },
  });

  function onSubmit(values: SplitterFormValues) {
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
              <FormLabel>Splitter Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., DHA-P6-S1" {...field} className="border-muted-foreground/20" />
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
                <Input placeholder="e.g., Street 5, DHA P6" {...field} className="border-muted-foreground/20" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
            control={form.control}
            name="oltId"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Parent OLT</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                    <SelectTrigger className="border-muted-foreground/20">
                    <SelectValue placeholder="Select an OLT" />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    {olts.map(olt => (
                        <SelectItem key={olt.id} value={olt.id}>{olt.name}</SelectItem>
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
            name="totalPorts"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Total Ports</FormLabel>
                <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="border-muted-foreground/20" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
              <FormField
            control={form.control}
            name="availablePorts"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Available Ports</FormLabel>
                <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="border-muted-foreground/20" />
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
            Save Splitter
          </Button>
        </div>
      </form>
    </Form>
  );
}
