'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Staff } from '@/lib/types';
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
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Staff>[] => [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.index + 1}
      </div>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'address',
    header: 'Address',
    cell: ({ row }) => {
      const address = row.getValue('address') as string | undefined;
      return (
        <div className="max-w-[200px] truncate text-muted-foreground">
          {address || '—'}
        </div>
      );
    },
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string;
      return <div className="font-mono text-xs">{phone || '—'}</div>;
    },
  },
  {
    accessorKey: 'appointedDate',
    header: 'Joining Date',
    cell: ({ row }) => {
      const date = row.getValue('appointedDate') as string | undefined;
      if (!date) return <span className="text-muted-foreground">—</span>;
      return <div className="text-xs">{new Date(date).toLocaleDateString('en-GB')}</div>;
    },
  },
  {
    accessorKey: 'salary',
    header: 'Salary (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('salary')) || 0;
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = (row.getValue('status') as string) || 'working';
      return (
        <Badge variant={status === 'left' ? 'destructive' : 'default'} className="capitalize">
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'plainPassword',
    header: 'Password',
    cell: ({ row }) => {
      const password = row.getValue('plainPassword') as string | undefined;
      return password ? <span className="font-mono text-xs">{password}</span> : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const staffMember = row.original;
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
              <DropdownMenuItem className="data-[highlighted]:text-emerald-600" onClick={() => onEdit(staffMember)}>Edit Staff</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive data-[highlighted]:text-red-600" onClick={() => onDelete(staffMember)}>
                Delete Staff
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
