'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { CustomBill } from '@/lib/types';
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
  onEdit: (bill: CustomBill) => void;
  onDelete: (bill: CustomBill) => void;
  subscribers?: any[];
}

export const getColumns = ({ onEdit, onDelete, subscribers = [] }: ColumnsProps): ColumnDef<CustomBill>[] => [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => {
      const date = row.original.date || row.original.createdAt;
      return date ? new Date(date).toLocaleDateString() : 'N/A';
    },
  },
  {
    accessorKey: 'subscriberName',
    header: 'Subscriber',
    cell: ({ row }) => {
      const bill = row.original;

      // 1. Try backend populated subscriberName
      if (bill.subscriberName) return bill.subscriberName;
      // 2. Try nested object relation
      if (bill.subscriber?.name) return bill.subscriber.name;
      // 3. Fallback: Search local subscribers array (if backend didn't supply it)
      const localSub = subscribers.find((s) => s.id === bill.subscriberId);
      if (localSub) return localSub.name;

      return 'Unknown';
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
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
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={status === 'paid' ? 'default' : 'secondary'}
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
      const bill = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(bill)}>Edit Bill</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(bill)}>
                Delete Bill
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
