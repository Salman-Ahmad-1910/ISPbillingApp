'use client';

import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import type { VendorInvoice, VendorInvoiceItem, Vendor, Product } from '@/lib/types';
import { vendorInvoiceSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

type VendorInvoiceFormValues = z.infer<typeof vendorInvoiceSchema>;

interface VendorInvoiceFormProps {
  invoice: VendorInvoice | null;
  vendors: Vendor[];
  products: Product[];
  onSave: (data: VendorInvoiceFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function VendorInvoiceForm({ 
  invoice, 
  vendors, 
  products, 
  onSave, 
  onCancel, 
  isSaving 
}: VendorInvoiceFormProps) {
  const form = useForm<VendorInvoiceFormValues>({
    resolver: zodResolver(vendorInvoiceSchema),
    defaultValues: invoice ? {
        ...invoice,
        items: invoice.items || [], // Ensure items is always an array
    } : {
      vendorId: '',
      vendorName: '',
      invoiceNumber: '', // Will be auto-generated
      invoiceDate: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      items: [],
    },
  });

  const items = form.watch('items');
  const selectedVendorId = form.watch('vendorId');

  // Update vendor name when vendor is selected
  useEffect(() => {
    if (selectedVendorId) {
      const vendor = vendors.find(v => v.id === selectedVendorId);
      if (vendor) {
        form.setValue('vendorName', vendor.name);
      }
    }
  }, [selectedVendorId, vendors, form]);

  // Calculate total amount whenever items change
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    form.setValue('totalAmount', total);
  }, [items, form]);

  const addItem = () => {
    const currentItems = form.getValues('items');
    form.setValue('items', [
      ...currentItems,
      {
        productId: '', // Will be set when product is selected
        productName: '',
        quantity: 1,
        unitPrice: 0,
        unitType: 'piece',
        subtotal: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues('items');
    form.setValue('items', currentItems.filter((_, i) => i !== index));
  };

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
          unitPrice: product.price, // Auto-populate from product
          subtotal: updatedItems[index].quantity * product.price, // Recalculate with new price
        };
      }
    } else if (field === 'quantity') {
      updatedItems[index] = {
        ...updatedItems[index],
        quantity: value,
        subtotal: value * updatedItems[index].unitPrice, // Recalculate subtotal
      };
    } else if (field === 'unitPrice') {
      updatedItems[index] = {
        ...updatedItems[index],
        unitPrice: value,
        subtotal: updatedItems[index].quantity * value, // Recalculate subtotal
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <FormLabel>Invoice Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Invoice Items</CardTitle>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!items || items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No items added. Click "Add Item" to start.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-2">
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
                      
                      <div>
                        <FormLabel className="text-sm">Unit Type</FormLabel>
                        {item.unitType ? (
                          <Badge variant={item.unitType === 'piece' ? 'default' : 'secondary'}>
                            {item.unitType === 'piece' ? 'Per Piece' : 'Per Meter'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Select product first</span>
                        )}
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
                      
                      <div>
                        <FormLabel className="text-sm">Subtotal</FormLabel>
                        <div className="font-medium">
                          PKR {item.subtotal.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Amount */}
        <div className="text-right">
          <div className="text-lg font-medium">
            Total Amount: PKR {form.watch('totalAmount').toFixed(2)}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Invoice'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
