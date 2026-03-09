'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { InventoryItem } from '@/lib/types';
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

interface ColumnsProps {
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<InventoryItem>[] => [
  {
    accessorKey: 'name',
    header: 'Item Name',
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.original.type}</Badge>,
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
    accessorKey: 'price',
    header: 'Price (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(String(row.getValue('price')));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge variant="secondary" className="capitalize">{row.original.status.replace('_', ' ')}</Badge>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const item = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(item)}>Edit / Adjust Stock</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(item)}>
                Delete Item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
