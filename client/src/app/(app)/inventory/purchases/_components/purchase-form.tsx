'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (selectedVendorId) {
      const vendor = vendors.find(v => v.id === selectedVendorId);
      if (vendor) {
        form.setValue('vendorName', vendor.name);
      }
    }
  }, [selectedVendorId, vendors, form]);

  useEffect(() => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = form.watch('discount') || 0;
    const salesTax = form.watch('salesTax') || 0;
    const wthTax = form.watch('wthTax') || 0;
    const total = subtotal - discount + salesTax + wthTax;
    form.setValue('totalAmount', total);
  }, [items, form]);

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    const product = products.find(p => p.id === productId);
    if (product) {
      const currentItems = form.getValues('items');
      const purchasePrice = product.purchasePrice || 0;
      const sellingPrice = product.salePrice || product.price || 0;
      const newItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        purchasePrice: purchasePrice,
        sellingPrice: sellingPrice,
        unitType: product.unitType || 'piece',
        focNormal: 'normal',
        subtotal: purchasePrice * 1,
      };
      form.setValue('items', [...currentItems, newItem]);
    }
  };

  const updateItemField = (field: string, value: any) => {
    const currentItems = form.getValues('items');
    if (currentItems.length === 0) return;
    const item = { ...currentItems[0], [field]: value };
    if (field === 'purchasePrice' || field === 'sellingPrice' || field === 'quantity') {
      const qty = field === 'quantity' ? value : item.quantity;
      const pp = field === 'purchasePrice' ? value : item.purchasePrice;
      item.subtotal = qty * pp;
    }
    form.setValue('items', [item]);
  };

  const removeItem = () => {
    form.setValue('items', []);
    setSelectedProduct('');
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

  const currentItem = items && items.length > 0 ? items[0] : null;
  const currentProduct = currentItem ? products.find(p => p.id === currentItem.productId) : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          <FormLabel>Product</FormLabel>
          {!currentItem ? (
            <Select value={selectedProduct} onValueChange={handleProductSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - PKR {product.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-sm">Selected Product</FormLabel>
                <div className="flex gap-2">
                  {currentProduct && (
                    <Button type="button" variant="outline" size="sm" onClick={() => triggerUpload(currentItem.productId)} disabled={uploadingId === currentItem.productId}>
                      {uploadingId === currentItem.productId ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                      Image
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={removeItem}>
                    Change Product
                  </Button>
                </div>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <FormLabel className="text-sm">Product</FormLabel>
                  <p className="font-medium text-sm mt-1">{currentItem.productName}</p>
                  {currentProduct?.image && (
                    <Image
                      src={backendImageUrl(currentProduct.image) || ''}
                      width={60}
                      height={60}
                      alt={currentItem.productName}
                      className="mt-1 rounded object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div>
                  <FormLabel className="text-sm">Purchase Price *</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentItem.purchasePrice}
                    onChange={(e) => updateItemField('purchasePrice', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <FormLabel className="text-sm">Selling Price *</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentItem.sellingPrice}
                    onChange={(e) => updateItemField('sellingPrice', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <FormLabel className="text-sm">Quantity *</FormLabel>
                  <Input
                    type="number"
                    min="1"
                    value={currentItem.quantity}
                    onChange={(e) => updateItemField('quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <FormLabel className="text-sm">Amount</FormLabel>
                  <p className="font-medium mt-1">PKR {currentItem.subtotal.toFixed(2)}</p>
                </div>
                <div>
                  <FormLabel className="text-sm">FOC/Normal</FormLabel>
                  <Select
                    value={currentItem.focNormal || 'normal'}
                    onValueChange={(value) => updateItemField('focNormal', value)}
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
                  <FormLabel className="text-sm">Expiry Date</FormLabel>
                  <Input
                    type="date"
                    value={currentItem.expiryDate || ''}
                    onChange={(e) => updateItemField('expiryDate', e.target.value || undefined)}
                  />
                </div>
                <div>
                  <FormLabel className="text-sm">Serial / MAC</FormLabel>
                  <Input
                    placeholder="e.g., SN-001 or 00:1A:2B:3C:4D:5E"
                    value={currentItem.serialNumber || ''}
                    onChange={(e) => updateItemField('serialNumber', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Add Purchase'}
          </Button>
        </div>
      </form>
    </Form>
  );
}