'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Product } from '@/lib/types';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProductColumnsProps {
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export const columns = ({ onEdit, onDelete }: ProductColumnsProps): ColumnDef<Product>[] => [
  {
    accessorKey: 'barcode',
    header: 'Barcode',
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.original.barcode || '-'}
      </div>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Product Name',
  },
  {
    accessorKey: 'brandName',
    header: 'Brand',
    cell: ({ row }) => (
      <div>{row.original.brandName || '-'}</div>
    ),
  },
  {
    accessorKey: 'productTypeName',
    header: 'Product Type',
    cell: ({ row }) => (
      <div>{row.original.productTypeName || row.original.category || '-'}</div>
    ),
  },
  {
    accessorKey: 'purchasePrice',
    header: () => <div className="text-right">Purchase Price</div>,
    cell: ({ row }) => {
      const amount = row.original.purchasePrice || 0;
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'salePrice',
    header: () => <div className="text-right">Sale Price</div>,
    cell: ({ row }) => {
      const amount = row.original.salePrice ?? row.original.price ?? 0;
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'discount',
    header: () => <div className="text-right">Discount</div>,
    cell: ({ row }) => {
      const amount = row.original.discount || 0;
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
        const product = row.original;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(product)}>Edit product</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(product)}>
                Delete product
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
