'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { OLT } from '@/lib/types';
import { Pencil, Trash2, Server, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnsProps {
  onEdit: (olt: OLT) => void;
  onDelete: (olt: OLT) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<OLT>[] => [
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
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-medium">
        <Server className="h-3.5 w-3.5 text-blue-500" />
        {row.original.name}
      </div>
    ),
  },
  {
    accessorKey: 'location',
    header: 'Location',
  },
  {
    accessorKey: 'ipAddress',
    header: 'IP Address',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 font-mono text-xs">
        <Globe className="h-3 w-3 text-muted-foreground" />
        {row.original.ipAddress}
      </div>
    ),
  },
  {
    accessorKey: 'ports',
    header: 'Ports',
    cell: ({ row }) => (
      <div className="text-center font-semibold tabular-nums text-muted-foreground">
        {row.original.ports}
      </div>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const olt = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 transition-all duration-300 hover:scale-110"
            onClick={() => onEdit(olt)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 transition-all duration-300 hover:scale-110"
            onClick={() => onDelete(olt)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      );
    },
  },
];
