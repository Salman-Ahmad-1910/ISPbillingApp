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
import type { Product, Brand, ProductType, UnitType } from '@/lib/types';
import { productSchema } from '@/lib/schemas';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useEffect, useMemo, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, PlusCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

function parseSerialNumbers(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[\s,\-]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product: Product | null;
  onSave: (data: ProductFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ProductForm({ product, onSave, onCancel, isSaving }: ProductFormProps) {
  const { companyId } = useCompany();

  const { data: brandsData } = useGenericQuery<Brand[]>('inventory/brands', companyId ?? undefined);
  const { data: productTypesData } = useGenericQuery<ProductType[]>('inventory/product-types', companyId ?? undefined);
  const { data: unitTypesData } = useGenericQuery<UnitType[]>('inventory/unit-types', companyId ?? undefined);
  const brands = brandsData ?? [];
  const productTypes = productTypesData ?? [];
  const unitTypes = unitTypesData ?? [];

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
        ...product,
        price: Number(product.price),
        stock: Number(product.stock),
        taxPercent: Number(product.taxPercent ?? 0),
        purchasePrice: Number(product.purchasePrice ?? 0),
        salePrice: Number(product.salePrice ?? 0),
        discount: Number(product.discount ?? 0),
        brandId: product.brandId || '',
        brandName: product.brandName || '',
        productTypeId: product.productTypeId || '',
        productTypeName: product.productTypeName || '',
        serialNumber: product.serialNumber || '',
        currentSerialIndex: product.currentSerialIndex ?? 0,
    } : {
      productCode: '',
      name: '',
      category: '',
      price: 0,
      stock: 0,
      unitType: 'piece',
      taxPercent: 0,
      image: '',
      brandId: '',
      brandName: '',
      productTypeId: '',
      productTypeName: '',
      purchasePrice: 0,
      salePrice: 0,
      discount: 0,
      serialNumber: '',
      currentSerialIndex: 0,
    },
  });

  const brandIdValue = form.watch('brandId');
  const productTypeIdValue = form.watch('productTypeId');
  const serialNumberValue = form.watch('serialNumber');
  const currentSerialIndex = form.watch('currentSerialIndex');

  const parsedSnCount = useMemo(() => parseSerialNumbers(serialNumberValue || '').length, [serialNumberValue]);
  const currentSn = useMemo(() => {
    const sns = parseSerialNumbers(serialNumberValue || '');
    if (sns.length === 0) return '';
    return sns[currentSerialIndex ?? 0] || sns[0];
  }, [serialNumberValue, currentSerialIndex]);

  useEffect(() => {
    if (!product && parsedSnCount > 0) {
      form.setValue('stock', parsedSnCount);
    }
  }, [parsedSnCount, product, form]);

  useEffect(() => {
    const brand = brands.find(b => b.id === brandIdValue);
    form.setValue('brandName', brand?.name || '');
  }, [brandIdValue, brands, form]);

  useEffect(() => {
    const pt = productTypes.find(pt => pt.id === productTypeIdValue);
    form.setValue('productTypeName', pt?.name || '');
  }, [productTypeIdValue, productTypes, form]);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [snDialogOpen, setSnDialogOpen] = useState(false);
  const [snDialogRaw, setSnDialogRaw] = useState('');
  const [snDialogSaving, setSnDialogSaving] = useState(false);

  const handleAddSNs = async () => {
    if (!product || !companyId) return;
    const newSNs = parseSerialNumbers(snDialogRaw);
    if (newSNs.length === 0) return;
    setSnDialogSaving(true);
    try {
      const existing = parseSerialNumbers(product.serialNumber || '');
      const combined = [...existing, ...newSNs].join(', ');
      const newStock = existing.length + newSNs.length;
      await api.put(`/inventory/products/${product.id}`, {
        name: product.name,
        category: product.category,
        price: product.price,
        stock: newStock,
        unitType: product.unitType,
        taxPercent: product.taxPercent ?? 0,
        image: product.image ?? '',
        salePrice: product.salePrice ?? 0,
        purchasePrice: product.purchasePrice ?? 0,
        discount: product.discount ?? 0,
        brandId: product.brandId ?? '',
        brandName: product.brandName ?? '',
        productTypeId: product.productTypeId ?? '',
        productTypeName: product.productTypeName ?? '',
        serialNumber: combined,
        currentSerialIndex: product.currentSerialIndex ?? 0,
      });
      form.setValue('serialNumber', combined);
      form.setValue('stock', newStock);
      queryClient.invalidateQueries({ queryKey: ['inventory/products', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/purchased-products', companyId] });
      toast({ title: 'Success', description: `${newSNs.length} serial number(s) added.` });
      setSnDialogOpen(false);
      setSnDialogRaw('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error || error.response?.data?.message || 'Failed to add serial numbers',
      });
    } finally {
      setSnDialogSaving(false);
    }
  };

  function onSubmit(values: ProductFormValues) {
    onSave({
      ...values,
      salePrice: values.salePrice,
      purchasePrice: values.purchasePrice,
      price: values.salePrice || values.price,
      category: productTypes.find(pt => pt.id === values.productTypeId)?.name || values.category,
    });
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {product && (
          <div className="p-3 bg-muted rounded-md">
            <div className="text-sm font-medium">Product ID</div>
            <div className="text-xs font-mono text-muted-foreground mt-1">{product.id}</div>
          </div>
        )}

        <FormField
          control={form.control}
          name="productCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g., P-001 (auto-generated if empty)" {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground">Leave empty to auto-generate (P-001, P-002, ...)</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., TP-Link Router" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="brandId"
            render={({ field }) => (
              <FormItem>
                <SearchableSelect
                  label="Brand"
                  value={field.value || null}
                  onValueChange={(val) => field.onChange(val || '')}
                  options={brands.map(b => ({ id: b.id, name: b.name }))}
                  placeholder="Search brand..."
                  searchPlaceholder="Type to search brands..."
                  allowClear={false}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productTypeId"
            render={({ field }) => (
              <FormItem>
                <SearchableSelect
                  label="Product Type"
                  value={field.value || null}
                  onValueChange={(val) => field.onChange(val || '')}
                  options={productTypes.map(pt => ({ id: pt.id, name: pt.name }))}
                  placeholder="Search product type..."
                  searchPlaceholder="Type to search product types..."
                  allowClear={false}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unitType"
            render={({ field }) => (
              <FormItem>
                {unitTypes.length > 0 ? (
                  <SearchableSelect
                    label="Unit Type"
                    value={unitTypes.find(ut => ut.name === field.value)?.id || null}
                    onValueChange={(val) => {
                      const selected = unitTypes.find(ut => ut.id === val);
                      field.onChange(selected?.name || 'piece');
                    }}
                    options={unitTypes.map(ut => ({ id: ut.id, name: ut.name }))}
                    placeholder="Search unit type..."
                    searchPlaceholder="Type to search unit types..."
                    allowClear={false}
                  />
                ) : (
                  <>
                    <FormLabel>Unit Type</FormLabel>
                    <Select value={field.value || 'piece'} onValueChange={(val) => field.onChange(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="piece">Per Piece</SelectItem>
                        <SelectItem value="meter">Per Meter</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="serialNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SN / MAC Numbers</FormLabel>
              {product && currentSn && (
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Current SN / MAC (will be sold next)</p>
                  <p className="text-sm font-mono font-semibold text-emerald-800 dark:text-emerald-200 mt-0.5">{currentSn}</p>
                </div>
              )}
              <FormControl>
                <textarea
                  placeholder="e.g., 00:1A:2B:3C:4D:5E, AA:BB:CC:DD:EE:FF, 11-22-33-44-55-66"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...field}
                  disabled={!!product}
                />
              </FormControl>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Separate multiple SN/MAC numbers with comma, space, or dash
                </p>
                {parsedSnCount > 0 && (
                  <span className="text-xs font-medium text-emerald-600">
                    {parsedSnCount} SN/MAC{parsedSnCount !== 1 ? 's' : ''} → stock = {parsedSnCount}
                  </span>
                )}
              </div>
              {product && (
                <p className="text-xs text-muted-foreground">
                  SN/MAC cannot be changed after creation. Current index: {(currentSerialIndex ?? 0) + 1} of {parsedSnCount}
                </p>
              )}
              {product && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSnDialogRaw('');
                    setSnDialogOpen(true);
                  }}
                  className="mt-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add More SNs
                </Button>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="purchasePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Price (PKR)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field}
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sale Price (PKR)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field}
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="discount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount (PKR)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field}
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
            {isSaving ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
          </Button>
        </div>
      </form>
    </Form>

    <Dialog open={snDialogOpen} onOpenChange={setSnDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Serial Numbers
          </DialogTitle>
          <DialogDescription>
            Add new serial numbers to <strong>{product?.name}</strong>. Separate each one with a comma or space.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="e.g., SN-1001 SN-1002 SN-1003"
            value={snDialogRaw}
            onChange={(e) => setSnDialogRaw(e.target.value)}
            className="min-h-[100px] font-mono"
          />
          {parseSerialNumbers(snDialogRaw).length > 0 && (
            <p className="text-xs text-muted-foreground">
              {parseSerialNumbers(snDialogRaw).length} serial number(s) will be added
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSnDialogOpen(false)} disabled={snDialogSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSNs}
              disabled={snDialogSaving || parseSerialNumbers(snDialogRaw).length === 0}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm hover:from-violet-600 hover:to-purple-700"
            >
              {snDialogSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {snDialogSaving ? 'Adding...' : `Add ${parseSerialNumbers(snDialogRaw).length || ''} SN(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
