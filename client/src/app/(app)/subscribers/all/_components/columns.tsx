'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { type Subscriber } from '@/lib/types';
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
import Link from 'next/link';

interface SubscriberColumnsProps {
  onEdit: (subscriber: Subscriber) => void;
  onDelete: (subscriber: Subscriber) => void;
}


export const getColumns = ({ onEdit, onDelete }: SubscriberColumnsProps): ColumnDef<Subscriber>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => row.original.name || '-',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => row.original.phone || '-',
  },
  {
    accessorKey: 'packageName',
    header: 'Package',
    cell: ({ row }) => <Badge variant="outline">{row.original.packageName || '-'}</Badge>,
  },
  {
    accessorKey: 'areaName',
    header: 'Area',
    cell: ({ row }) => row.original.areaName || '-',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
      if (status === 'active') variant = 'default';
      if (status === 'suspended') variant = 'destructive';

      return (
        <Badge
          variant={variant}
          className={status === 'active' ? 'bg-green-600' : ''}
        >
          {status || '-'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'balance',
    header: 'Balance (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('balance') || '0');
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      const isNegative = amount < 0;
      return <div className={`text-right font-medium ${isNegative ? 'text-green-600' : ''}`}>{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const subscriber = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(subscriber)}>Edit subscriber</DropdownMenuItem>
              <DropdownMenuItem>Receive Payment</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Suspend</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(subscriber)}>
                Delete Subscriber
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
