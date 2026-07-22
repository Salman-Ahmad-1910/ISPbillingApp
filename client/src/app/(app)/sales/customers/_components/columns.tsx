'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { type Customer } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SalesCustomerColumnsProps {
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export const getColumns = ({ onEdit, onDelete }: SalesCustomerColumnsProps): ColumnDef<Customer>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-violet-100 dark:bg-violet-900/30 p-1.5">
          <User className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        </div>
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: 'cnic',
    header: 'CNIC',
    cell: ({ row }) => (
      <span className="text-sm font-mono">{row.original.cnic}</span>
    ),
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
    header: () => <div className="text-right">Outstanding</div>,
    cell: ({ row }) => {
      const amount = parseFloat(String(row.getValue('outstandingBalance')));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium whitespace-nowrap">PKR {formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => onEdit(customer)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => onDelete(customer)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
