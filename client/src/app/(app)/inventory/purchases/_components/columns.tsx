'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Purchase } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Pencil, Printer, DollarSign, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    id: 'sn',
    header: 'SN',
    cell: ({ row }) => {
      const items = row.original.items || [];
      const firstSn = items.find(item => item.serialNumber)?.serialNumber || '-';
      const display = firstSn.length > 10 ? firstSn.substring(0, 10) + '...' : firstSn;
      return <span className="text-xs font-mono" title={firstSn}>{display}</span>;
    },
  },
  {
    id: 'company',
    header: 'Company',
    cell: () => <span className="text-muted-foreground">{companyName || '-'}</span>,
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
    header: 'Actions',
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onPay(purchase)} title="Pay">
            <DollarSign className="h-4 w-4 text-green-600" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(purchase)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onPrint(purchase)} title="Print Invoice">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(purchase)} title="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      );
    },
  },
];