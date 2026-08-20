'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { VendorInvoice, VendorInvoiceItem } from '@/lib/types';
import { MoreHorizontal, Calendar, Building2, Printer, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FlatRow {
  invoice: VendorInvoice;
  item: VendorInvoiceItem;
  isFirst: boolean;
  itemCount: number;
}

interface VendorInvoiceColumnsProps {
  onEdit: (invoice: VendorInvoice) => void;
  onDelete: (invoice: VendorInvoice) => void;
  onPrint: (invoice: VendorInvoice) => void;
}

export const columns = ({ onEdit, onDelete, onPrint }: VendorInvoiceColumnsProps): ColumnDef<FlatRow>[] => [
  {
    id: 'index',
    header: '#',
    cell: ({ row }) => <span className="font-mono text-xs">{row.index + 1}</span>,
  },
  {
    id: 'vendorName',
    header: 'Vendor',
    cell: ({ row }) => {
      const vendorName = row.original.invoice.vendorName;
      return (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>{row.original.isFirst ? vendorName : ''}</span>
        </div>
      );
    },
  },
  {
    id: 'invoiceDate',
    header: 'Buying Date',
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{row.original.isFirst ? row.original.invoice.invoiceDate : ''}</span>
        </div>
      );
    },
  },
  {
    id: 'batch',
    header: 'Batch',
    cell: ({ row }) => {
      return (
        <div className="text-sm">
          {row.original.isFirst ? (row.original.invoice.batch || '—') : ''}
        </div>
      );
    },
  },
  {
    id: 'productName',
    header: 'Product',
    cell: ({ row }) => (
      <div className="text-sm">{row.original.item.productName}</div>
    ),
  },
  {
    id: 'serialNumber',
    header: 'SN / MAC',
    cell: ({ row }) => {
      const sn = row.original.item.serialNumber || '';
      if (!sn) return <div className="text-xs font-mono text-muted-foreground">—</div>;
      const sns = sn.split(/[,\s]+/).map((s: string) => s.trim()).filter(Boolean);
      if (sns.length === 0) return <div className="text-xs font-mono text-muted-foreground">—</div>;
      return (
        <div className="text-xs font-mono text-muted-foreground" title={sn}>
          {sns.length === 1 ? sns[0] : `${sns[0]} (${sns.length}/${sns.length})`}
        </div>
      );
    },
  },
  {
    id: 'quantity',
    header: () => <div className="text-center">Qty</div>,
    cell: ({ row }) => (
      <div className="text-center font-semibold">{row.original.item.quantity}</div>
    ),
  },
  {
    id: 'unitPrice',
    header: () => <div className="text-right">Unit Price</div>,
    cell: ({ row }) => (
      <div className="text-right whitespace-nowrap">
        PKR {row.original.item.unitPrice.toFixed(2)}
      </div>
    ),
  },
  {
    id: 'subtotal',
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium whitespace-nowrap">
        PKR {row.original.item.subtotal.toFixed(2)}
      </div>
    ),
  },
  {
    id: 'totalAmount',
    header: () => <div className="text-right">Invoice Total</div>,
    cell: ({ row }) => {
      if (!row.original.isFirst) return <span />;
      const amount = row.original.invoice.totalAmount;
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return (
        <div className="text-right font-medium whitespace-nowrap">
          PKR {formatted}
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      if (!row.original.isFirst) return <span />;
      const invoice = row.original.invoice;
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
                Print
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(invoice)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(invoice)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

// Helper to flatten invoices into one row per product (grouping multiple items with same productId)
export function flattenInvoiceItems(invoices: any[]): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const invoice of invoices) {
    const items = invoice.items || [];
    if (items.length === 0) {
      rows.push({ invoice, item: { productId: '', productName: '', quantity: 0, unitPrice: 0, unitType: '', subtotal: 0, serialNumber: '' } as any, isFirst: true, itemCount: 0 });
    } else {
      // Group items by productId, combining SNs and summing quantities
      const grouped = new Map<string, { productName: string; quantity: number; unitPrice: number; unitType: string; subtotal: number; serialNumbers: string[] }>();
      for (const item of items) {
        const key = item.productId;
        if (grouped.has(key)) {
          const g = grouped.get(key)!;
          g.quantity += item.quantity;
          g.subtotal += item.subtotal;
          if (item.serialNumber) {
            const sns = item.serialNumber.split(/[,\s]+/).map((s: string) => s.trim()).filter(Boolean);
            g.serialNumbers.push(...sns);
          }
        } else {
          const sns = item.serialNumber ? item.serialNumber.split(/[,\s]+/).map((s: string) => s.trim()).filter(Boolean) : [];
          grouped.set(key, {
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitType: item.unitType,
            subtotal: item.subtotal,
            serialNumbers: sns,
          });
        }
      }
      let isFirst = true;
      for (const [, g] of grouped) {
        rows.push({
          invoice,
          item: {
            productId: items[0].productId,
            productName: g.productName,
            quantity: g.quantity,
            unitPrice: g.unitPrice,
            unitType: g.unitType,
            subtotal: g.subtotal,
            serialNumber: g.serialNumbers.join(', '),
          },
          isFirst,
          itemCount: grouped.size,
        });
        isFirst = false;
      }
    }
  }
  return rows;
}
