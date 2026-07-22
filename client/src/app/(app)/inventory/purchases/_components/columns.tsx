'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Purchase } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Pencil, Printer, DollarSign, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PurchaseColumnsProps {
  onEdit: (purchase: Purchase) => void;
  onPay: (purchase: Purchase) => void;
  onPrint: (purchase: Purchase) => void;
  onDelete: (purchase: Purchase) => void;
  companyName?: string | null;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  paid: 'default',
  unpaid: 'destructive',
  partial: 'secondary',
};

export const columns = ({ onEdit, onPay, onPrint, onDelete, companyName }: PurchaseColumnsProps): ColumnDef<Purchase>[] => [
  {
    accessorKey: 'billId',
    header: 'Bill ID',
    cell: ({ row }) => {
      const billId = row.original.billId || row.original.purchaseNumber;
      return <span className="font-medium">{billId}</span>;
    },
  },
  {
    accessorKey: 'vendorName',
    header: 'Vendor',
    cell: ({ row }) => {
      return <span>{row.original.vendorName}</span>;
    },
  },
  {
    id: 'products',
    header: 'Products',
    cell: ({ row }) => {
      const items = row.original.items || [];
      const names = items.map(i => i.productName).filter(Boolean);
      if (names.length === 0) return <span className="text-muted-foreground">-</span>;
      const display = names.length > 2
        ? `${names.slice(0, 2).join(', ')} +${names.length - 2} more`
        : names.join(', ');
      return <span className="text-sm" title={names.join(', ')}>{display}</span>;
    },
  },
  {
    accessorKey: 'purchaseDate',
    header: 'Date',
    cell: ({ row }) => <span>{row.original.purchaseDate}</span>,
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total Amount',
    cell: ({ row }) => {
      const amount = parseFloat(String(row.getValue('totalAmount')));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="font-medium">PKR {formatted}</div>;
    },
  },
  {
    id: 'quantity',
    header: 'Quantity',
    cell: ({ row }) => {
      const totalQty = row.original.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      return <div className="font-medium">{totalQty}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant={statusVariant[status] || 'secondary'}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onPay(purchase)}>
              <DollarSign className="mr-2 h-4 w-4 text-green-600" />
              Pay
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(purchase)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPrint(purchase)}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(purchase)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
