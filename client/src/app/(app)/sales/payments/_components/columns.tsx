'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Payment } from '@/lib/types';
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

interface PaymentColumnsProps {
  onEdit: (payment: Payment) => void;
  onDelete: (payment: Payment) => void;
}

export const getColumns = ({ onEdit, onDelete }: PaymentColumnsProps): ColumnDef<Payment>[] => [
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
    accessorKey: 'invoiceId',
    header: 'Invoice ID',
  },
  {
    accessorKey: 'subscriberName',
    header: 'Customer',
  },
  {
    accessorKey: 'paymentDate',
    header: 'Payment Date',
  },
  {
    accessorKey: 'method',
    header: 'Method',
    cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.original.method}</Badge>
  },
  {
    accessorKey: 'amount',
    header: 'Amount (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const payment = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(payment)}>Edit Payment</DropdownMenuItem>
              {/* <DropdownMenuItem>Send Receipt</DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(payment)}>
                Delete Payment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
