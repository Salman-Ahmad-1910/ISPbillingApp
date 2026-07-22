'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { VendorInvoice } from '@/lib/types';
import { MoreHorizontal, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VendorInvoiceColumnsProps {
  onEdit: (invoice: VendorInvoice) => void;
  onDelete: (invoice: VendorInvoice) => void;
}

export const columns = ({ onEdit, onDelete }: VendorInvoiceColumnsProps): ColumnDef<VendorInvoice>[] => [
  {
    id: 'productId',
    header: 'Product ID',
    cell: ({ row }) => {
      const items = row.original.items;
      if (!items || items.length === 0) return <span className="text-muted-foreground">—</span>;
      const id = items[0]?.productId;
      return (
        <div className="text-xs font-mono" title={id}>
          {id || '—'}
        </div>
      );
    },
  },
  {
    accessorKey: 'vendorName',
    header: 'Vendor',
    cell: ({ row }) => {
      const vendorName = row.original.vendorName;
      return (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>{vendorName}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'invoiceDate',
    header: 'Buying Date',
    cell: ({ row }) => {
      const invoiceDate = row.original.invoiceDate;
      return (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{invoiceDate}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'batch',
    header: 'Batch',
    cell: ({ row }) => {
      const batch = row.original.batch;
      return (
        <div className="text-sm">
          {batch || '—'}
        </div>
      );
    },
  },
  {
    accessorKey: 'totalAmount',
    header: () => <div className="text-right">Total Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('totalAmount'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return (
        <div className="text-right font-medium whitespace-nowrap">
          PKR {formatted}
        </div>
      );
    },
  },
  {
    accessorKey: 'items',
    header: 'Products',
    cell: ({ row }) => {
      const items = row.original.items;
      if (!items || items.length === 0) return <span className="text-muted-foreground">—</span>;
      const names = items.map((item: any) => item.productName);
      const display = names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
      return (
        <div className="text-sm max-w-[200px] truncate" title={names.join(', ')}>
          {display}
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const invoice = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(invoice)}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(invoice)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
