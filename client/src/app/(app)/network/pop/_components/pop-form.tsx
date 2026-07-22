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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { POP } from '@/lib/types';
import { popSchema } from '@/lib/schemas';

type POPFormValues = z.infer<typeof popSchema>;

interface POPFormProps {
  pop: POP | null;
  onSave: (data: POPFormValues) => void;
  onCancel: () => void;
}

export function POPForm({ pop, onSave, onCancel }: POPFormProps) {
  const form = useForm<POPFormValues>({
    resolver: zodResolver(popSchema),
    defaultValues: pop || {
      name: '',
      location: '',
      status: 'online',
    },
  });

  function onSubmit(values: POPFormValues) {
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
              <FormLabel>POP Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., DHA Phase 6 POP" {...field} className="border-muted-foreground/20" />
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
                <Input placeholder="e.g., Office 1, Comm. Street 10" {...field} className="border-muted-foreground/20" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
               <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="border-muted-foreground/20">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:hover:bg-rose-950/30 transition-all duration-300">
            Cancel
          </Button>
          <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md">
            Save POP
          </Button>
        </div>
      </form>
    </Form>
  );
}
