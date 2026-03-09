'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { type Customer } from '@/lib/types';
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

interface CustomerColumnsProps {
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export const getColumns = ({ onEdit, onDelete }: CustomerColumnsProps): ColumnDef<Customer>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'cnic',
    header: 'CNIC',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
  },
  {
    accessorKey: 'city',
    header: 'City',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={
            status === 'active'
              ? 'default'
              : status === 'blacklisted'
                ? 'destructive'
                : 'secondary'
          }
          className={status === 'active' ? 'bg-green-600' : ''}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'outstandingBalance',
    header: 'Outstanding (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(String(row.getValue('outstandingBalance')));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const customer = row.original;
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
              {/* <Link href={`/crm/customers/${customer.id}`}>
                <DropdownMenuItem>View details</DropdownMenuItem>
              </Link> */}
              <DropdownMenuItem onClick={() => onEdit(customer)}>Edit customer</DropdownMenuItem>
              {/* <DropdownMenuSeparator /> */}
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(customer)}>
                Delete customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
