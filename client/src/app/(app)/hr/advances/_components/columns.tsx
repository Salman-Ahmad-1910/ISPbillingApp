'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { AdvanceLoan } from '@/lib/types';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

interface ColumnsProps {
  onEdit: (advance: AdvanceLoan) => void;
  onDelete: (advance: AdvanceLoan) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<AdvanceLoan>[] => [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.original.id?.slice(0, 8)}
      </div>
    ),
  },
  {
    accessorKey: 'staffName',
    header: 'Employee',
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const category = row.original.category;
      return <div className="capitalize">{category}</div>;
    },
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'amount',
    header: 'Issue',
    cell: ({ row }) => {
      if (row.original.direction !== 'issue') return <div className="text-muted-foreground">-</div>;
      const amount = parseFloat(row.getValue('amount'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'returnAmount',
    header: 'Return',
    cell: ({ row }) => {
      if (row.original.direction !== 'return') return <div className="text-muted-foreground">-</div>;
      const amount = parseFloat(row.getValue('amount'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'returnValue',
    header: 'Loan Return Value',
    cell: ({ row }) => {
      const val = row.original.returnValue;
      if (!val || val === 0) return <div className="text-muted-foreground">-</div>;
      const formatted = new Intl.NumberFormat('en-US').format(val);
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'comments',
    header: 'Comment',
    cell: ({ row }) => {
      const comments = row.original.comments;
      return <div className="max-w-[200px] truncate text-muted-foreground">{comments || '-'}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const advance = row.original;
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
              <DropdownMenuItem className="data-[highlighted]:text-emerald-600" onClick={() => onEdit(advance)}>Edit Record</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive data-[highlighted]:text-red-600" onClick={() => onDelete(advance)}>
                Delete Record
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
