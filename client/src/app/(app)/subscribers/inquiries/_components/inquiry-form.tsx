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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Inquiry } from '@/lib/types';
import { inquirySchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

type InquiryFormValues = z.infer<typeof inquirySchema>;

interface InquiryFormProps {
  inquiry: Inquiry | null;
  areas: any[];
  boxes: any[];
  packages: any[];
  onSave: (data: InquiryFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function InquiryForm({ inquiry, areas, boxes, packages, onSave, onCancel, isSaving }: InquiryFormProps) {
  const sublocalities = Array.from(new Set(areas.map((a: any) => a.subLocality).filter(Boolean))) as string[];

  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: inquiry ? {
      name: inquiry.name,
      internetId: inquiry.internetId || '',
      cell: inquiry.cell || '',
      mobile: inquiry.mobile || '',
      address: inquiry.address,
      installationAmount: inquiry.installationAmount || 0,
      otherAmount: inquiry.otherAmount || 0,
      installationDate: inquiry.installationDate || '',
      rechargeDate: inquiry.rechargeDate || '',
      subLocality: inquiry.subLocality || '',
      connectionType: (inquiry.connectionType as any) || '',
      boxNumber: inquiry.boxNumber || '',
      packageCable: inquiry.packageCable || '',
      discount: inquiry.discount || 0,
      amount: inquiry.amount || 0,
      comments: inquiry.comments || '',
      status: inquiry.status,
      notes: inquiry.notes || '',
    } : {
      name: '',
      internetId: '',
      cell: '',
      mobile: '',
      address: '',
      installationAmount: 0,
      otherAmount: 0,
      installationDate: '',
      rechargeDate: '',
      subLocality: '',
      connectionType: '',
      boxNumber: '',
      packageCable: '',
      discount: 0,
      amount: 0,
      comments: '',
      status: 'new',
      notes: '',
    },
  });

  function onSubmit(values: InquiryFormValues) {
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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input className="border-muted-foreground/20" placeholder="e.g., Jane Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="internetId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internet ID</FormLabel>
              <FormControl>
                <Input className="border-muted-foreground/20" placeholder="Internet ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cell"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cell</FormLabel>
                <FormControl>
                  <Input className="border-muted-foreground/20" placeholder="e.g., 0300-1234567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile</FormLabel>
                <FormControl>
                  <Input className="border-muted-foreground/20" placeholder="e.g., 0301-1234567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Full address of potential customer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="installationAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Installation Amount</FormLabel>
                <FormControl>
                  <Input className="border-muted-foreground/20" type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="otherAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Other Amount</FormLabel>
                <FormControl>
                  <Input className="border-muted-foreground/20" type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="installationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Installation Date</FormLabel>
                <FormControl>
                  <Input className="border-muted-foreground/20" type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rechargeDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recharge Date</FormLabel>
                <FormControl>
                  <Input className="border-muted-foreground/20" type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="subLocality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sublocality</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-muted-foreground/20">
                      <SelectValue placeholder="Select sublocality" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sublocalities.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="connectionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connection Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-muted-foreground/20">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="both">Both</SelectItem>
                    <SelectItem value="internet">Internet</SelectItem>
                    <SelectItem value="tv_cable">TV Cable</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="boxNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Box Number</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-muted-foreground/20">
                      <SelectValue placeholder="Select box" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {boxes.map((box: any) => (
                      <SelectItem key={box.id} value={box.name}>{box.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="packageCable"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Package Cable</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-muted-foreground/20">
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {packages.map((pkg: any) => (
                      <SelectItem key={pkg.id} value={pkg.name}>{pkg.name} - PKR {pkg.price?.toLocaleString()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="discount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount</FormLabel>
                <FormControl>
                  <Input className="border-muted-foreground/20" type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input className="border-muted-foreground/20" type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comment</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter comments..." className="min-h-[100px]" {...field} />
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
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving} className="border-rose-200 text-rose-600 hover:bg-rose-50">
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105 disabled:hover:scale-100">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Add'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
