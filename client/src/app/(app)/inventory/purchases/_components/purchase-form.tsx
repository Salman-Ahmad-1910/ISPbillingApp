'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Loader2, Upload } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/context/company-context';
import { backendImageUrl } from '@/lib/utils';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

interface PurchaseFormProps {
  purchase: Purchase | null;
  vendors: Vendor[];
  products: Product[];
  onSave: (data: PurchaseFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function PurchaseForm({
  purchase,
  vendors,
  products,
  onSave,
  onCancel,
  isSaving
}: PurchaseFormProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevVendorIdRef = useRef<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId } = useCompany();

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

  const { data: vendorInvoices = [] } = useGenericQuery<any>(
    companyId ? 'inventory/vendor-invoices' : null,
    companyId ?? undefined
  );

  const handleVendorInvoiceSelect = useCallback((invoiceId: string) => {
    const vi = vendorInvoices.find((inv: any) => inv.id === invoiceId);
    if (vi) {
      form.setValue('billId', vi.invoiceNumber || '');
      form.setValue('batch', vi.batch || '');
      if (vi.vendorId) {
        form.setValue('vendorId', vi.vendorId);
        form.setValue('vendorName', vi.vendorName || '');
      }
      if (vi.items?.length > 0) {
        const merged = new Map<string, any>();
        for (const item of vi.items) {
          const existing = merged.get(item.productId);
          if (existing) {
            existing.quantity += item.quantity;
            existing.subtotal = existing.quantity * existing.purchasePrice;
          } else {
            const product = products.find((p: any) => p.id === item.productId);
            const purchasePrice = item.unitPrice || 0;
            merged.set(item.productId, {
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              purchasePrice,
              sellingPrice: product?.salePrice || product?.price || 0,
              unitType: item.unitType || 'piece',
              focNormal: 'normal',
              subtotal: item.subtotal || purchasePrice * item.quantity,
            });
          }
        }
        form.setValue('items', Array.from(merged.values()));
      }
    }
  }, [vendorInvoices, products, form]);

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

  const updateItemField = (index: number, field: string, value: any) => {
    const currentItems = [...form.getValues('items')];
    if (index >= currentItems.length) return;
    const item = { ...currentItems[index], [field]: value };
    const qty = field === 'quantity' ? value : item.quantity;
    const pp = field === 'purchasePrice' ? value : item.purchasePrice;
    item.subtotal = qty * pp;
    currentItems[index] = item;
    form.setValue('items', currentItems, { shouldDirty: true, shouldTouch: true });
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues('items');
    const updated = currentItems.filter((_, i) => i !== index);
    form.setValue('items', updated);
  };

  const handleImageUpload = async (productId: string, file: File) => {
    setUploadingId(productId);
    try {
      const formData = new FormData();
      formData.append('image', file);
      await api.post(`/upload/product-image/${productId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.invalidateQueries({ queryKey: ['inventory/products', companyId] });
      toast({
        title: 'Image uploaded',
        description: 'Product image has been updated.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err.response?.data?.message || 'Failed to upload image',
      });
    } finally {
      setUploadingId(null);
    }
  };

  const triggerUpload = (productId: string) => {
    fileInputRef.current?.click();
    fileInputRef.current!.dataset.productId = productId;
  };

  function onSubmit(values: PurchaseFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {vendorInvoices.length > 0 && (
          <div className="space-y-2">
            <FormLabel>Link Vendor Invoice (auto-fills Bill ID, Batch & Vendor)</FormLabel>
            <Select onValueChange={handleVendorInvoiceSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a vendor invoice to auto-fill" />
              </SelectTrigger>
              <SelectContent>
                {vendorInvoices.map((vi: any) => (
                  <SelectItem key={vi.id} value={vi.id}>
                    {vi.invoiceNumber} — {vi.vendorName}{vi.batch ? ` — ${vi.batch}` : ''} — PKR {vi.totalAmount?.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/jpg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              const pid = fileInputRef.current?.dataset.productId;
              if (file && pid) {
                handleImageUpload(pid, file);
              }
              e.target.value = '';
            }}
          />

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No products added yet. Select a vendor invoice above to add products.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div key={index} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.productName}</span>
                        {product?.image && (
                          <Image
                            src={backendImageUrl(product.image) || ''}
                            width={32}
                            height={32}
                            alt={item.productName}
                            className="rounded object-cover"
                            unoptimized
                          />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => triggerUpload(item.productId)} disabled={uploadingId === item.productId}>
                          {uploadingId === item.productId ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                          Image
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => removeItem(index)}>
                          Remove
                        </Button>
                      </div>
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
                        <FormLabel className="text-xs">Quantity *</FormLabel>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemField(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
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
                          placeholder="e.g., SN-001"
                          value={item.serialNumber || ''}
                          onChange={(e) => updateItemField(index, 'serialNumber', e.target.value)}
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
