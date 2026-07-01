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
import { Loader2 } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { SearchableSelect } from '@/components/ui/searchable-select';

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
        barcode: product.barcode || '',
        brandId: product.brandId || '',
        productTypeId: product.productTypeId || '',
    } : {
      name: '',
      category: '',
      price: 0,
      stock: 0,
      unitType: 'piece',
      taxPercent: 0,
      image: '',
      barcode: '',
      brandId: '',
      productTypeId: '',
      purchasePrice: 0,
      salePrice: 0,
      discount: 0,
    },
  });

  function onSubmit(values: ProductFormValues) {
    const productType = productTypes.find(pt => pt.id === values.productTypeId);
    onSave({
      ...values,
      salePrice: values.salePrice,
      purchasePrice: values.purchasePrice,
      price: values.salePrice || values.price,
      category: productType?.name || values.category,
    });
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

        <FormField
          control={form.control}
          name="barcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Barcode</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 8901234567890" {...field} />
              </FormControl>
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
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Add Product'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
