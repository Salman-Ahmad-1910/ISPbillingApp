'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { AdvanceLoan } from '@/lib/types';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    header: 'Return Value',
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
    header: 'Action',
    cell: ({ row }) => {
      const advance = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            title="Edit Record"
            onClick={() => onEdit(advance)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
            title="Delete Record"
            onClick={() => onDelete(advance)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
