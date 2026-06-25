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
import type { Product } from '@/lib/types';
import { productSchema } from '@/lib/schemas';
import { backendImageUrl } from '@/lib/utils';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product: Product | null;
  onSave: (data: ProductFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ProductForm({ product, onSave, onCancel, isSaving }: ProductFormProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(product?.image);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
        ...product,
        price: Number(product.price),
        stock: Number(product.stock),
        taxPercent: Number(product.taxPercent ?? 0),
    } : {
      name: '',
      category: '',
      price: 0,
      stock: 0,
      unitType: 'piece',
      taxPercent: 0,
      image: '',
    },
  });

  // Keep the hidden image field in sync.
  const onImageChange = (val?: string) => {
    setImageUrl(val);
    form.setValue('image', val || '');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!product?.id) {
      toast({ variant: 'destructive', title: 'Save first', description: 'Save the product before uploading an image.' });
      return;
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post(`/upload/product-image/${product.id}?companyId=${companyId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const img = res.data?.data?.image as string | undefined;
      onImageChange(img);
      queryClient.invalidateQueries({ queryKey: ['inventory/products', companyId] });
      toast({ title: 'Success', description: 'Image uploaded.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Failed to upload image' });
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  function onSubmit(values: ProductFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {product && (
          <div className="p-3 bg-muted rounded-md">
            <div className="text-sm font-medium">Product ID</div>
            <div className="text-xs font-mono text-muted-foreground mt-1">{product.id}</div>
          </div>
        )}

        {/* Optional product image */}
        <FormItem>
          <FormLabel>Product Image (Optional)</FormLabel>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 rounded-md border bg-muted overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                <Image src={backendImageUrl(imageUrl) || ''} alt="product" fill className="object-cover" unoptimized />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" onChange={handleUpload} className="hidden" />
              <Button type="button" variant="outline" size="sm" disabled={!product?.id || isUploading} onClick={() => fileRef.current?.click()}>
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {imageUrl ? 'Change Image' : 'Upload Image'}
              </Button>
              {imageUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => onImageChange(undefined)}>
                  <X className="mr-2 h-4 w-4" /> Remove
                </Button>
              )}
              {!product?.id && (
                <p className="text-xs text-muted-foreground">Save the product first, then upload an image.</p>
              )}
            </div>
          </div>
        </FormItem>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., TP-Link Router" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Router" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unitType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="piece">Per Piece</SelectItem>
                  <SelectItem value="meter">Per Meter</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (PKR)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="taxPercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax (%)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="stock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock Quantity</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
