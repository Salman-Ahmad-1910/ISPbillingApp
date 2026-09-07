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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubscriberSelect } from '@/components/ui/subscriber-select';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';
import { UserRound } from 'lucide-react';
import type { Complaint, Subscriber, Staff, RecoveryOfficer } from '@/lib/types';
import { complaintSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

type ComplaintFormValues = z.infer<typeof complaintSchema>;

interface ComplaintFormProps {
  complaint: Complaint | null;
  subscribers: Subscriber[];
  staff: Staff[];
  recoveryOfficers: RecoveryOfficer[];
  onSave: (data: ComplaintFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ComplaintForm({ complaint, subscribers, staff, recoveryOfficers, onSave, onCancel, isSaving }: ComplaintFormProps) {
  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: complaint || {
      subscriberId: '',
      category: 'network',
      description: '',
      status: 'open',
      assignedToId: 'unassigned',
    },
  });

  const assigneeOptions = [
    ...(staff || []).map((member) => ({ id: member.id, name: member.name, secondary: `${member.designation} (Staff)` })),
    ...(recoveryOfficers || []).map((officer) => ({ id: officer.id, name: officer.name, secondary: 'Recovery Officer' })),
  ];

  function onSubmit(values: ComplaintFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="subscriberId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subscriber</FormLabel>
              <FormControl>
                <SubscriberSelect
                  subscribers={subscribers}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Search by subscriber ID or name..."
                  disabled={!!complaint}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the issue..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="network">Network</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                </Select>
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
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
          control={form.control}
          name="assignedToId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign To</FormLabel>
              <FormControl>
                <SearchableDropdown
                  icon={UserRound}
                  color="text-emerald-600"
                  items={assigneeOptions}
                  value={field.value === 'unassigned' ? '' : (field.value || '')}
                  onValueChange={(id) => field.onChange(id || 'unassigned')}
                  placeholder="Search staff or recovery officer..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:shadow-md transition-all duration-300">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Complaint'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
