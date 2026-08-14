'use client';

import { useEffect } from 'react';
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
import type { VendorInvoice, VendorInvoiceItem, Vendor, Product } from '@/lib/types';
import { vendorInvoiceSchema } from '@/lib/schemas';
import { Loader2, Plus, Trash2 } from 'lucide-react';

type VendorInvoiceFormValues = z.infer<typeof vendorInvoiceSchema>;

interface VendorInvoiceFormProps {
  invoice: VendorInvoice | null;
  vendors: Vendor[];
  products: Product[];
  onSave: (data: VendorInvoiceFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
  onSaveValidationError?: (message: string) => void;
}

export function VendorInvoiceForm({ 
  invoice, 
  vendors, 
  products, 
  onSave, 
  onCancel, 
  isSaving,
  onSaveValidationError
}: VendorInvoiceFormProps) {
  const form = useForm<VendorInvoiceFormValues>({
    resolver: zodResolver(vendorInvoiceSchema),
    defaultValues: invoice ? {
        ...invoice,
        items: invoice.items || [],
    } : {
      vendorId: '',
      vendorName: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      batch: '',
      totalAmount: 0,
      items: [],
    },
  });

  const items = form.watch('items');
  const selectedVendorId = form.watch('vendorId');

  useEffect(() => {
    if (selectedVendorId) {
      const vendor = vendors.find(v => v.id === selectedVendorId);
      if (vendor) {
        form.setValue('vendorName', vendor.name);
      }
    }
  }, [selectedVendorId, vendors, form]);

  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    form.setValue('totalAmount', total);
  }, [items, form]);

  useEffect(() => {
    if (!invoice && items.length === 0) {
      form.setValue('items', [{
        productId: '',
        productName: '',
        quantity: 1,
        unitPrice: 0,
        unitType: 'piece',
        subtotal: 0,
      }]);
    }
  }, [invoice, items.length, form]);

  const updateItem = (index: number, field: keyof VendorInvoiceItem, value: any) => {
    const currentItems = form.getValues('items');
    const updatedItems = [...currentItems];
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index] = {
          ...updatedItems[index],
          productId: value,
          productName: product.name,
          unitType: product.unitType,
          unitPrice: product.purchasePrice || product.price,
          subtotal: updatedItems[index].quantity * (product.purchasePrice || product.price),
          serialNumber: product.serialNumber || '',
        };
      }
    } else if (field === 'quantity') {
      updatedItems[index] = {
        ...updatedItems[index],
        quantity: value,
        subtotal: value * updatedItems[index].unitPrice,
      };
    } else if (field === 'unitPrice') {
      updatedItems[index] = {
        ...updatedItems[index],
        unitPrice: value,
        subtotal: updatedItems[index].quantity * value,
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };
    }
    
    form.setValue('items', updatedItems);
  };

  function onSubmit(values: VendorInvoiceFormValues) {
    onSave(values);
  }

  function onValidationError() {
    const errorCount = Object.keys(form.formState.errors).length;
    if (errorCount > 0) {
      const messages = Object.entries(form.formState.errors)
        .map(([key, error]) => {
          if (key === 'items') {
            return 'Please ensure the product, quantity, and price are valid.';
          }
          return error?.message as string;
        })
        .filter(Boolean);
      onSaveValidationError?.(messages.length > 0 ? messages.join('. ') : 'Please fix the form errors before saving.');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onValidationError)} className="space-y-6">
        {/* Vendor & Buying Date */}
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
            name="invoiceDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Buying Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

        {/* Product Section — multiple products per invoice */}
        {items.length > 0 && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Product Details</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentItems = form.getValues('items');
                  form.setValue('items', [...currentItems, {
                    productId: '',
                    productName: '',
                    quantity: 1,
                    unitPrice: 0,
                    unitType: 'piece',
                    subtotal: 0,
                  }]);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Product #{index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    disabled={items.length <= 1}
                    onClick={() => {
                      const currentItems = form.getValues('items');
                      form.setValue('items', currentItems.filter((_, i) => i !== index));
                    }}
                    title="Remove product"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div>
                  <FormLabel className="text-sm">Product *</FormLabel>
                  <Select
                    value={item.productId || undefined}
                    onValueChange={(value) => updateItem(index, 'productId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FormLabel className="text-sm">Unit Type</FormLabel>
                    <Input
                      readOnly
                      value={item.unitType === 'piece' ? 'Per Piece' : item.unitType === 'meter' ? 'Per Meter' : item.unitType === 'kilogram' ? 'Per Kg' : item.unitType === 'liter' ? 'Per Liter' : item.unitType || '—'}
                      className="bg-muted"
                    />
                  </div>

                  <div>
                    <FormLabel className="text-sm">SN / MAC</FormLabel>
                    <Input
                      readOnly
                      value={item.serialNumber || ''}
                      className="bg-muted"
                      placeholder="Auto-filled from product"
                    />
                  </div>

                  <div>
                    <FormLabel className="text-sm">Quantity *</FormLabel>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div>
                    <FormLabel className="text-sm">Unit Price *</FormLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder={item.productId ? "Auto from product" : "Select product first"}
                    />
                  </div>
                </div>

                <div>
                  <FormLabel className="text-sm">Subtotal</FormLabel>
                  <Input
                    readOnly
                    value={`PKR ${item.subtotal.toFixed(2)}`}
                    className="bg-muted font-semibold"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Total Amount */}
        <div className="text-right border-t pt-4">
          <div className="text-lg font-medium">
            Total Amount: PKR {form.watch('totalAmount').toFixed(2)}
          </div>
        </div>

        {Object.keys(form.formState.errors).length > 0 && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {Object.entries(form.formState.errors).map(([key, error]) => (
              <p key={key}>{error?.message as string}</p>
            ))}
            {form.formState.errors.items && (
              <p className="mt-1">Please ensure a valid product, quantity, and price are provided.</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
