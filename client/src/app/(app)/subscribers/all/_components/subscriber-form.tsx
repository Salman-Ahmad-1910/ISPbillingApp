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
import { Textarea } from '@/components/ui/textarea';
import type { Subscriber, Package, Area, Splitter } from '@/lib/types';
import { subscriberSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

type SubscriberFormValues = z.infer<typeof subscriberSchema>;

interface SubscriberFormProps {
  subscriber: Subscriber | null;
  packages: Package[];
  areas: Area[];
  splitters: Splitter[];
  onSave: (data: SubscriberFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function SubscriberForm({ subscriber, packages, areas, splitters, onSave, onCancel, isSaving }: SubscriberFormProps) {
  const form = useForm<SubscriberFormValues>({
    resolver: zodResolver(subscriberSchema),
    defaultValues: subscriber || {
      subscriber_identity: '',
      name: '',
      cnic: '',
      phone: '',
      installationAddress: '',
      packageId: '',
      areaId: '',
      splitterId: '',
      splitterPort: 1,
      status: 'active',
      balance: 0,
      connectionDate: new Date().toISOString().split('T')[0],
    },
  });

  function onSubmit(values: SubscriberFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="subscriber_identity"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Subscriber ID</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., SUB-001" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., 0300-1234567" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
            control={form.control}
            name="cnic"
            render={({ field }) => (
                <FormItem>
                <FormLabel>CNIC</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., 42201-1234567-8" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <FormField
          control={form.control}
          name="installationAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Installation Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Full installation address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="packageId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Package</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a package" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {packages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name} - {pkg.speed}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="areaId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Area</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an area" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {areas.map((area) => (
                            <SelectItem key={area.id} value={area.id}>
                            {area.locality}, {area.city}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
            control={form.control}
            name="splitterId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Splitter</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a splitter" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {splitters.map((splitter) => (
                            <SelectItem key={splitter.id} value={splitter.id}>
                            {splitter.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="splitterPort"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Splitter Port</FormLabel>
                <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="connectionDate"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Connection Date</FormLabel>
                <FormControl>
                    <Input type="date" {...field} />
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
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="deactivated">Deactivated</SelectItem>
                        </SelectContent>
                    </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Subscriber'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
