'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
import type { Purchase, Vendor, Product } from '@/lib/types';
import { purchaseSchema } from '@/lib/schemas';
import { Loader2, PlusCircle } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

function parseSerialNumbers(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  return raw.split(/[\s,\-]+/).map(s => s.trim()).filter(Boolean);
}

interface VendorProduct {
  productId: string;
  productName: string;
  unitPrice: number;
  unitType: string;
  allSNs: string[];
  vendorInvoiceId: string;
  invoiceNumber: string;
  batch: string;
}

interface PurchaseFormProps {
  purchase: Purchase | null;
  vendors: Vendor[];
  products: Product[];
  purchases?: Purchase[];
  onSave: (data: PurchaseFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function PurchaseForm({
  purchase,
  vendors,
  products,
  purchases = [],
  onSave,
  onCancel,
  isSaving
}: PurchaseFormProps) {
  const prevVendorIdRef = useRef<string>('');
  const productSelectTriggerRef = useRef<HTMLButtonElement>(null);
  const [showProductSelect, setShowProductSelect] = useState(false);
  const { companyId } = useCompany();

  const { data: vendorInvoices = [] } = useGenericQuery<any>(
    companyId ? 'inventory/vendor-invoices' : null,
    companyId ?? undefined
  );

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: purchase ? {
      ...purchase,
      items: purchase.items || [],
    } : {
      vendorId: '',
      vendorName: '',
      purchaseNumber: '',
      billId: '',
      batch: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      remainingAmount: 0,
      discount: 0,
      salesTax: 0,
      wthTax: 0,
      status: 'unpaid',
      items: [],
    },
  });

  const items = form.watch('items');
  const selectedVendorId = form.watch('vendorId');

  useEffect(() => {
    if (selectedVendorId && selectedVendorId !== prevVendorIdRef.current) {
      prevVendorIdRef.current = selectedVendorId;
      const vendor = vendors.find(v => v.id === selectedVendorId);
      if (vendor) {
        form.setValue('vendorName', vendor.name);
      }
    }
  }, [selectedVendorId, vendors, form]);

  useEffect(() => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = form.getValues('discount') || 0;
    const salesTax = form.getValues('salesTax') || 0;
    const wthTax = form.getValues('wthTax') || 0;
    const total = subtotal - discount + salesTax + wthTax;
    form.setValue('totalAmount', total);
  }, [items, form]);

  // SNs already consumed by other purchases are no longer available.
  // When editing, this purchase's own SNs stay selectable.
  const usedSNsByOtherPurchases = useMemo(() => {
    const set = new Set<string>();
    for (const p of purchases) {
      if (purchase && p.id === purchase.id) continue;
      for (const item of p.items || []) {
        parseSerialNumbers(item.serialNumber || '').forEach(sn => set.add(sn));
      }
    }
    return set;
  }, [purchases, purchase]);

  const vendorProducts = useMemo((): VendorProduct[] => {
    if (!selectedVendorId) return [];
    const productMap = new Map<string, VendorProduct>();
    for (const vi of vendorInvoices) {
      if (vi.vendorId !== selectedVendorId || !vi.items) continue;
      for (const item of vi.items) {
        const itemSNs = parseSerialNumbers(item.serialNumber || '');
        if (itemSNs.length === 0) continue;

        // The purchase page sources its products/SNs from the vendor invoice
        // items. Only SNs not yet consumed by another purchase remain.
        const unconsumedSNs = itemSNs.filter(sn => !usedSNsByOtherPurchases.has(sn));
        if (unconsumedSNs.length === 0) continue;

        const existing = productMap.get(item.productId);
        if (existing) {
          existing.allSNs.push(...unconsumedSNs);
        } else {
          const product = products.find(p => p.id === item.productId);
          productMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice || 0,
            unitType: item.unitType || product?.unitType || 'piece',
            allSNs: [...unconsumedSNs],
            vendorInvoiceId: vi.id,
            invoiceNumber: vi.invoiceNumber || '',
            batch: vi.batch || '',
          });
        }
      }
    }
    return Array.from(productMap.values());
  }, [selectedVendorId, vendorInvoices, products, usedSNsByOtherPurchases]);

  const getAvailableSNs = (productId: string, excludeIndex: number): string[] => {
    const vp = vendorProducts.find(p => p.productId === productId);
    if (!vp) return [];
    const usedByOthers = new Set<string>();
    items.forEach((item, i) => {
      if (i === excludeIndex) return;
      if (item.productId === productId && item.serialNumber) {
        parseSerialNumbers(item.serialNumber).forEach(sn => usedByOthers.add(sn));
      }
    });
    return vp.allSNs.filter(sn => !usedByOthers.has(sn));
  };

  const addItem = (productId: string) => {
    const vp = vendorProducts.find(p => p.productId === productId);
    if (!vp) return;
    const currentItems = form.getValues('items');
    const availableSNs = getAvailableSNs(productId, currentItems.length);
    const maxQty = availableSNs.length || 1;
    const qty = Math.min(1, maxQty);
    const snString = availableSNs.slice(0, qty).join(', ');
    const newItem = {
      productId,
      productName: vp.productName,
      quantity: qty,
      purchasePrice: vp.unitPrice,
      sellingPrice: vp.unitPrice,
      unitType: vp.unitType,
      focNormal: 'normal',
      serialNumber: snString,
      subtotal: vp.unitPrice * qty,
      saleTax: 0,
      wthTax: 0,
      disc: 0,
    };
    form.setValue('items', [...currentItems, newItem], { shouldDirty: true, shouldTouch: true });
    if (vp.invoiceNumber) form.setValue('billId', vp.invoiceNumber);
    if (vp.batch) form.setValue('batch', vp.batch);
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues('items');
    const updated = currentItems.filter((_, i) => i !== index);
    form.setValue('items', updated);
  };

  const updateItemField = (index: number, field: string, value: any) => {
    const currentItems = [...form.getValues('items')];
    if (index >= currentItems.length) return;
    const item = { ...currentItems[index] };

    if (field === 'quantity') {
      const availableSNs = getAvailableSNs(item.productId, index);
      const maxQty = availableSNs.length || 1;
      const qty = Math.max(1, Math.min(Number(value) || 1, maxQty));
      const snString = availableSNs.slice(0, qty).join(', ');
      item.quantity = qty;
      item.serialNumber = snString;
      item.subtotal = qty * item.purchasePrice;
    } else if (field === 'purchasePrice') {
      item.purchasePrice = value;
      item.subtotal = item.quantity * value;
    } else if (field === 'sellingPrice') {
      item.sellingPrice = value;
    } else {
      (item as any)[field] = value;
    }

    currentItems[index] = item;
    form.setValue('items', currentItems, { shouldDirty: true, shouldTouch: true });
  };

  function onSubmit(values: PurchaseFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vendorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
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
            name="billId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bill ID</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., BILL-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="batch"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batch</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., BATCH-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Products</FormLabel>
          </div>

          {!selectedVendorId ? (
            <p className="text-sm text-muted-foreground text-center py-4">Select a vendor first to add products.</p>
          ) : vendorProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No vendor invoices found for this vendor.</p>
          ) : null}

          {selectedVendorId && vendorProducts.length > 0 && (
            <div className="flex items-center gap-2">
              <Select open={showProductSelect} onOpenChange={setShowProductSelect} onValueChange={(value) => { addItem(value); setShowProductSelect(false); }}>
                <SelectTrigger ref={productSelectTriggerRef} className="w-full">
                  <SelectValue placeholder="Select a product to add..." />
                </SelectTrigger>
                <SelectContent>
                  {vendorProducts.map((vp) => (
                    <SelectItem key={vp.productId} value={vp.productId}>
                      {vp.productName}{vp.allSNs.length > 0 ? ` (${vp.allSNs.length} SNs)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => setShowProductSelect(true)}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((item, index) => {
                const vp = vendorProducts.find(p => p.productId === item.productId);
                const availableSNs = getAvailableSNs(item.productId, index);
                const totalSNs = vp ? vp.allSNs.length : 0;
                const maxQty = availableSNs.length || 1;
                const sns = parseSerialNumbers(item.serialNumber || '');

                return (
                  <div key={index} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.productName}</span>
                        {sns.length > 0 && (
                          <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                            {sns.length === 1 ? `SN: ${sns[0]}` : `${sns[0]} (1/${sns.length})`}
                          </span>
                        )}
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => removeItem(index)}>
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <FormLabel className="text-xs">Purchase Price *</FormLabel>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.purchasePrice}
                          onChange={(e) => updateItemField(index, 'purchasePrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <FormLabel className="text-xs">Selling Price *</FormLabel>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.sellingPrice}
                          onChange={(e) => updateItemField(index, 'sellingPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <FormLabel className="text-xs">
                          Quantity * {maxQty > 0 && <span className="text-muted-foreground font-normal">(max {maxQty})</span>}
                        </FormLabel>
                        <Input
                          type="number"
                          min="1"
                          max={maxQty}
                          value={item.quantity}
                          onChange={(e) => updateItemField(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                        {item.productId && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {totalSNs > 0
                              ? `${item.quantity} of ${totalSNs} SNs assigned`
                              : 'No SNs on this product'
                            }
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <FormLabel className="text-xs">FOC/Normal</FormLabel>
                        <Select
                          value={item.focNormal || 'normal'}
                          onValueChange={(value) => updateItemField(index, 'focNormal', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="foc">FOC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <FormLabel className="text-xs">Expiry Date</FormLabel>
                        <Input
                          type="date"
                          value={item.expiryDate || ''}
                          onChange={(e) => updateItemField(index, 'expiryDate', e.target.value || undefined)}
                        />
                      </div>
                      <div>
                        <FormLabel className="text-xs">Serial / MAC</FormLabel>
                        <Input
                          readOnly
                          value={item.serialNumber || ''}
                          className="bg-muted font-mono text-xs"
                          placeholder="Auto-assigned from vendor invoice"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <FormLabel className="text-xs">Amount</FormLabel>
                        <p className="font-medium text-sm mt-1.5">PKR {item.subtotal.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
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
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salesTax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sales Tax</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="wthTax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wth Tax</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="text-right">
          <div className="text-lg font-medium">
            Total Amount: PKR {form.watch('totalAmount').toFixed(2)}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : purchase ? 'Update' : 'Add Purchase'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
