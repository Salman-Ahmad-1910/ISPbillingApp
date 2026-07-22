'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { DistributionBox } from '@/lib/types';
import { Pencil, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnsProps {
    onEdit: (box: DistributionBox) => void;
    onDelete: (box: DistributionBox) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<DistributionBox>[] => [
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
    accessorKey: 'name',
    header: 'Box / Media Number',
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-medium">
        <Package className="h-3.5 w-3.5 text-teal-500" />
        {row.original.name}
      </div>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const box = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 transition-all duration-300 hover:scale-110"
            onClick={() => onEdit(box)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 transition-all duration-300 hover:scale-110"
            onClick={() => onDelete(box)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      );
    },
  },
];
