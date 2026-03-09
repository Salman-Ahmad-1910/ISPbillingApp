'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { DealerCollection } from '@/lib/types';
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

export const columns: ColumnDef<DealerCollection>[] = [
  {
    accessorKey: 'id',
    header: 'Collection ID',
  },
  {
    accessorKey: 'dealerName',
    header: 'Dealer',
  },
  {
    accessorKey: 'subscriberName',
    header: 'Subscriber',
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
    accessorKey: 'collectionDate',
    header: 'Collection Date',
  },
  {
    accessorKey: 'settlementStatus',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.settlementStatus;
      return (
        <Badge
          variant={status === 'settled' ? 'default' : 'secondary'}
          className={status === 'settled' ? 'bg-green-600' : ''}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
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
              {row.original.settlementStatus === 'pending' && (
                <DropdownMenuItem>Mark as Settled</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
