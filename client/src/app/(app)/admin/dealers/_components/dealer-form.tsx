'use client';

import React, { useState } from 'react';
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
import { Eye, EyeOff } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { PermissionGuard } from '@/components/PermissionGuard';
import { PERMISSIONS } from '@/lib/permissions';
import type { Dealer, DealerFranchise } from '@/lib/types';
import { dealerSchema } from '@/lib/schemas';

type DealerFormValues = z.infer<typeof dealerSchema>;

interface DealerFormProps {
  dealer: Dealer | null;
  dealers: Dealer[];
  onSave: (data: DealerFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function DealerForm({ dealer, dealers, onSave, onCancel, isSaving }: DealerFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<DealerFormValues>({
    resolver: zodResolver(dealerSchema),
    defaultValues: dealer || {
      name: '',
      phone: '',
      email: '',
      password: '',
      cnic: '',
      commissionRate: 0,
      parentDealerId: 'none',
    },
  });

  // Handle existing dealer with null parentDealerId
  React.useEffect(() => {
    if (dealer && dealer.parentDealerId === null) {
      form.setValue('parentDealerId', 'none');
    }
  }, [dealer, form]);

  function onSubmit(values: DealerFormValues) {
    // Convert "none" to null for parentDealerId
    const submitValues = {
      ...values,
      parentDealerId: values.parentDealerId === 'none' ? null : values.parentDealerId
    };
    onSave(submitValues);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dealer Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., QuickNet Communications" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="e.g., dealer@example.com" disabled={!!dealer} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!dealer && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        {...field}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="commissionRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Commission Rate (%)</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parentDealerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Dealer (for Sub-Dealers)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent dealer (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None (Top-level Dealer)</SelectItem>
                  {dealers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <PermissionGuard permission={PERMISSIONS.DEALERS_MANAGE} fallback={<Button type="submit" disabled>Save Dealer</Button>}>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Dealer'}
            </Button>
          </PermissionGuard>
        </div>
      </form>
    </Form>
  );
}
