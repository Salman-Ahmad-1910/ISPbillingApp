'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Product } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
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
    accessorKey: 'id',
    header: 'Product ID',
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
  },
  {
    accessorKey: 'unitType',
    header: 'Unit Type',
    cell: ({ row }) => {
      const unitType = row.original.unitType;
      return (
        <Badge variant={unitType === 'piece' ? 'default' : 'secondary'}>
          {unitType === 'piece' ? 'Per Piece' : 'Per Meter'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'price',
    header: 'Price (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('price'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'stock',
    header: 'Stock',
     cell: ({ row }) => {
      const stock = row.original.stock;
      return (
        <div className="text-center">
            <Badge variant={stock > 10 ? 'default' : stock > 0 ? 'secondary' : 'destructive'} className={stock > 10 ? 'bg-green-600' : ''}>{stock > 0 ? `${stock} in stock` : 'Out of stock'}</Badge>
        </div>
      )
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
