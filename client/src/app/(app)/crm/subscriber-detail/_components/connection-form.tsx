'use client';

import React from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Connection, Area, DistributionBox, Package, Company, Splitter } from '@/lib/types';
import { connectionSchema } from '@/lib/schemas';

type ConnectionFormValues = z.infer<typeof connectionSchema>;

interface ConnectionFormProps {
  connection: Connection | null;
  areas: Area[];
  boxes: DistributionBox[];
  packages: Package[];
  companies: Company[];
  splitters: Splitter[];
  onSave: (data: ConnectionFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

function calcDiscountedAmount(base: number, discount: string): number {
  switch (discount) {
    case 'quarter': return Math.round(base * 0.75);
    case 'half': return Math.round(base * 0.50);
    case 'full_free': return 0;
    case 'no_discount':
    case 'custom':
    default:
      return base;
  }
}

export function ConnectionForm({ connection, areas, boxes, packages, companies, splitters, onSave, onCancel, isSaving }: ConnectionFormProps) {

  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionSchema),
    defaultValues: connection ? {
      internetId: connection.internetId,
      sublocalityId: connection.sublocalityId || '',
      name: connection.name,
      address: connection.address || '',
      cell: connection.cell || '',
      mobile: connection.mobile || '',
      installationAmount: connection.installationAmount,
      otherAmount: connection.otherAmount,
      installationDate: connection.installationDate || '',
      rechargeDate: connection.rechargeDate || '',
      connectionProvider: connection.connectionProvider || '',
      connectionType: connection.connectionType,
      boxNumber: connection.boxNumber || '',
      packageCable: connection.packageCable || '',
      discount: connection.discount || '',
      amount: connection.amount,
      packageInternet: connection.packageInternet || '',
      createBalance: connection.createBalance,
      balanceDays: connection.balanceDays,
      sameDiscount: connection.sameDiscount || '',
      sameAmount: connection.sameAmount,
      status: connection.status,
      splitterId: connection.splitterId || '',
      splitterPort: connection.splitterPort || 0,
    } : {
      internetId: '',
      sublocalityId: '',
      name: '',
      address: '',
      cell: '',
      mobile: '',
      installationAmount: 0,
      otherAmount: 0,
      installationDate: '',
      rechargeDate: '',
      connectionProvider: '',
      connectionType: 'both',
      boxNumber: '',
      packageCable: '',
      discount: '',
      amount: 0,
      packageInternet: '',
      createBalance: false,
      balanceDays: 0,
      sameDiscount: '',
      sameAmount: 0,
      status: 'active',
      splitterId: '',
      splitterPort: 0,
    },
  });

  React.useEffect(() => {
    if (connection) {
      form.reset({
        internetId: connection.internetId,
        sublocalityId: connection.sublocalityId || '',
        name: connection.name,
        address: connection.address || '',
        cell: connection.cell || '',
        mobile: connection.mobile || '',
        installationAmount: connection.installationAmount,
        otherAmount: connection.otherAmount,
        installationDate: connection.installationDate || '',
        rechargeDate: connection.rechargeDate || '',
        connectionProvider: connection.connectionProvider || '',
        connectionType: connection.connectionType,
        boxNumber: connection.boxNumber || '',
        packageCable: connection.packageCable || '',
        discount: connection.discount || '',
        amount: connection.amount,
        packageInternet: connection.packageInternet || '',
        createBalance: connection.createBalance,
        balanceDays: connection.balanceDays,
        sameDiscount: connection.sameDiscount || '',
        sameAmount: connection.sameAmount,
        status: connection.status,
        splitterId: connection.splitterId || '',
        splitterPort: connection.splitterPort || 0,
      });
    } else {
      form.reset({
        internetId: '',
        sublocalityId: '',
        name: '',
        address: '',
        cell: '',
        mobile: '',
        installationAmount: 0,
        otherAmount: 0,
        installationDate: '',
        rechargeDate: '',
        connectionProvider: '',
        connectionType: 'both',
        boxNumber: '',
        packageCable: '',
        discount: '',
        amount: 0,
        packageInternet: '',
        createBalance: false,
        balanceDays: 0,
        sameDiscount: '',
        sameAmount: 0,
        status: 'active',
        splitterId: '',
        splitterPort: 0,
      });
    }
  }, [connection, form]);

  const createBalance = form.watch('createBalance');
  const connectionType = form.watch('connectionType');
  const discount = form.watch('discount');
  const sameDiscount = form.watch('sameDiscount');
  const installationAmount = form.watch('installationAmount');
  const otherAmount = form.watch('otherAmount');

  const showCable = connectionType === 'both' || connectionType === 'tv_cable';
  const showInternet = connectionType === 'both' || connectionType === 'internet';
  const isCableDisabled = !showCable;
  const isInternetDisabled = !showInternet;

  const baseAmount = (installationAmount || 0) + (otherAmount || 0);

  React.useEffect(() => {
    if (discount === 'custom') return;
    if (showCable) {
      form.setValue('amount', calcDiscountedAmount(baseAmount, discount), { shouldValidate: true });
    }
  }, [baseAmount, discount, showCable, form]);

  React.useEffect(() => {
    if (sameDiscount === 'custom') return;
    if (showInternet) {
      form.setValue('sameAmount', calcDiscountedAmount(baseAmount, sameDiscount), { shouldValidate: true });
    }
  }, [baseAmount, sameDiscount, showInternet, form]);

  function onSubmit(values: ConnectionFormValues) {
    onSave(values);
  }

  const discountOptions = [
    { value: 'no_discount', label: 'No discount' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'half', label: 'Half' },
    { value: 'full_free', label: 'Full Free' },
    { value: 'custom', label: 'Custom' },
  ];

  const connectionTypeOptions = [
    { value: 'both', label: 'Both' },
    { value: 'internet', label: 'Internet' },
    { value: 'tv_cable', label: 'TV Cable' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'deactivated', label: 'Deactivated' },
    { value: 'suspended', label: 'Suspended' },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="internetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Internet ID</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., INT-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sublocalityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sublocality</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sublocality" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.subLocality || area.locality || area.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Installation address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cell"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cell</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 0300-1234567" {...field} />
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
                  <Input placeholder="e.g., 0312-7654321" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="installationAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Installation Amount</FormLabel>
                <FormControl>
                  <Input type="number" value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
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
                  <Input type="number" value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="installationDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Installation Date</FormLabel>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rechargeDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Recharge Date</FormLabel>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="connectionProvider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connection Provider</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.name}>{company.name}</SelectItem>
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {connectionTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
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
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="boxNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Box Number</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select box number" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {boxes.map((box) => (
                    <SelectItem key={box.id} value={box.name}>{box.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="splitterId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Splitter</FormLabel>
                <Select onValueChange={(val) => {
                  field.onChange(val);
                  form.setValue('splitterPort', 0);
                }} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select splitter" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {splitters.filter(s => s.availablePorts > 0 || s.id === connection?.splitterId).map((splitter) => (
                      <SelectItem key={splitter.id} value={splitter.id}>
                        {splitter.name} ({splitter.availablePorts}/{splitter.totalPorts} ports free)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.watch('splitterId') && (
            <FormField
              control={form.control}
              name="splitterPort"
              render={({ field }) => {
                const selectedSplitter = splitters.find(s => s.id === form.watch('splitterId'));
                const maxPorts = selectedSplitter?.totalPorts || 0;
                return (
                  <FormItem>
                    <FormLabel>Splitter Port (1-{maxPorts})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={maxPorts}
                        value={field.value || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          if (val >= 0 && val <= maxPorts) {
                            field.onChange(val);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          )}
        </div>

        <div className={`rounded-lg border border-border p-4 space-y-4 transition-opacity ${isCableDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cable Information</h3>
            {isCableDisabled && <span className="text-xs text-muted-foreground ml-auto">(Disabled - Internet only)</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="packageCable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Cable</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isCableDisabled}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cable package" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.name}>{pkg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isCableDisabled}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select discount" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {discountOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{discount === 'custom' ? 'Amount' : discount === 'quarter' ? 'Quarterly Amount (25% off)' : discount === 'half' ? 'Half Amount (50% off)' : discount === 'full_free' ? 'Full Free (100% off)' : 'Amount'}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value ?? ''}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      disabled={isCableDisabled || discount !== 'custom'}
                    />
                  </FormControl>
                  {discount !== 'custom' && discount !== 'no_discount' && (
                    <p className="text-xs text-muted-foreground">
                      Base: {baseAmount} → {calcDiscountedAmount(baseAmount, discount)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className={`rounded-lg border border-border p-4 space-y-4 transition-opacity ${isInternetDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Internet Information</h3>
            {isInternetDisabled && <span className="text-xs text-muted-foreground ml-auto">(Disabled - Cable only)</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="packageInternet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Internet</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isInternetDisabled}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select internet package" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.name}>{pkg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sameDiscount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internet Discount</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isInternetDisabled}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select discount" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {discountOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sameAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{sameDiscount === 'custom' ? 'Internet Amount' : sameDiscount === 'quarter' ? 'Quarterly Internet Amount (25% off)' : sameDiscount === 'half' ? 'Half Internet Amount (50% off)' : sameDiscount === 'full_free' ? 'Full Free (100% off)' : 'Internet Amount'}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value ?? ''}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      disabled={isInternetDisabled || sameDiscount !== 'custom'}
                    />
                  </FormControl>
                  {sameDiscount !== 'custom' && sameDiscount !== 'no_discount' && (
                    <p className="text-xs text-muted-foreground">
                      Base: {baseAmount} → {calcDiscountedAmount(baseAmount, sameDiscount)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="createBalance"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Create Balance</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {createBalance && (
          <FormField
            control={form.control}
            name="balanceDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Balance Days</FormLabel>
                <FormControl>
                  <Input type="number" value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : (connection ? 'Update Subscriber' : 'Add Subscriber')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
