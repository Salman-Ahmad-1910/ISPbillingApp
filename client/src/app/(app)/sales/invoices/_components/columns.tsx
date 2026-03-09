'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Invoice } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface InvoiceColumnsProps {
  onPrint: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
}

export const getColumns = ({ onPrint, onEdit, onDelete }: InvoiceColumnsProps): ColumnDef<Invoice>[] => [
  {
    accessorKey: 'id',
    header: 'Invoice ID',
  },
  {
    accessorKey: 'subscriberName',
    header: 'Customer',
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
    accessorKey: 'dueDate',
    header: 'Due Date',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={
            status === 'paid' ? 'default' :
            status === 'overdue' ? 'destructive' : 'secondary'
          }
          className={status === 'paid' ? 'bg-green-600' : ''}
        >
          {status}
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
              <DropdownMenuItem>View details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(invoice)}>Edit Invoice</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPrint(invoice)}>
                <Printer className="mr-2 h-4 w-4" />
                Print Invoice
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Send Reminder</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(invoice)}>Delete Invoice</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
