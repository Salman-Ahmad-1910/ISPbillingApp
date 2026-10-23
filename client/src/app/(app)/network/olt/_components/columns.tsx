'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { OLT } from '@/lib/types';
import { Pencil, Trash2, Server, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnsProps {
  onEdit: (olt: OLT) => void;
  onDelete: (olt: OLT) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export const getColumns = ({ onEdit, onDelete, canUpdate = true, canDelete = true }: ColumnsProps): ColumnDef<OLT>[] => [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => (
      <div
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-800 via-green-600 to-green-400 text-[11px] font-bold text-white ring-1 ring-green-900/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.35),0_3px_6px_rgba(0,0,0,0.3)]"
        title={`ID: ${row.index + 1}`}
      >
        <span className="pointer-events-none absolute left-2 top-1 h-2 w-2 rounded-full bg-white/50 blur-[1px]" aria-hidden />
        <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
          {row.index + 1}
        </span>
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
          {canUpdate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 transition-all duration-300 hover:scale-110"
              onClick={() => onEdit(olt)}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 transition-all duration-300 hover:scale-110"
              onClick={() => onDelete(olt)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </div>
      );
    },
  },
];
