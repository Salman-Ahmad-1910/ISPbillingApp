'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Sale {
  id: string;
  subscriberId: string;
  subscriberName: string;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  date: string;
  companyId: string;
  items: SaleItem[];
}

interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export const columns: ColumnDef<Sale>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => {
      const date = row.original.date;
      return date ? new Date(date).toLocaleDateString() : 'N/A';
    },
  },
  {
    accessorKey: 'subscriberName',
    header: 'Customer',
  },
  {
    accessorKey: 'paymentMethod',
    header: 'Payment Method',
    cell: ({ row }) => {
      const method = row.original.paymentMethod;
      return (
        <Badge variant="outline">
          {method}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'items',
    header: 'Items',
    cell: ({ row }) => {
      const items = row.original.items || [];
      return (
        <div className="text-sm">
          {items.length} item{items.length !== 1 ? 's' : ''}
          <div className="text-xs text-muted-foreground">
            {items.slice(0, 2).map(item => item.productName).join(', ')}
            {items.length > 2 && '...'}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total Amount',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('totalAmount'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">${formatted}</div>;
    },
  },
  {
    accessorKey: 'taxAmount',
    header: 'Tax',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('taxAmount'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right text-sm text-muted-foreground">${formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const sale = row.original;
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
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Print Receipt</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Delete Sale</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
