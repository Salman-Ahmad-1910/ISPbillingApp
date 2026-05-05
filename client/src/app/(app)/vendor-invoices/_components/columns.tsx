'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { VendorInvoice } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Printer, Calendar, Building2, FileText } from 'lucide-react';
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
  onPrint: (invoice: VendorInvoice) => void;
  onEdit: (invoice: VendorInvoice) => void;
  onDelete: (invoice: VendorInvoice) => void;
}

export const columns = ({ onPrint, onEdit, onDelete }: VendorInvoiceColumnsProps): ColumnDef<VendorInvoice>[] => [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.original.id}
      </div>
    ),
  },
  {
    accessorKey: 'invoiceNumber',
    header: 'Invoice Number',
    cell: ({ row }) => {
      const invoiceNumber = row.original.invoiceNumber;
      return (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium">{invoiceNumber}</span>
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
    header: 'Invoice Date',
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
    accessorKey: 'totalAmount',
    header: 'Total Amount',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('totalAmount'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return (
        <div className="text-right font-medium">
          PKR {formatted}
        </div>
      );
    },
  },
  {
    accessorKey: 'items',
    header: 'Items',
    cell: ({ row }) => {
      const items = row.original.items;
      const itemCount = items?.length || 0;
      return (
        <Badge variant="outline">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </Badge>
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
              <DropdownMenuItem onClick={() => onPrint(invoice)}>
                <Printer className="mr-2 h-4 w-4" />
                Print Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(invoice)}>Edit invoice</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(invoice)}>
                Delete invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
