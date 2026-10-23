'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Area } from '@/lib/types';
import { Pencil, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnsProps {
    onEdit: (area: Area) => void;
    onDelete: (area: Area) => void;
    canUpdate?: boolean;
    canDelete?: boolean;
}

export const getColumns = ({ onEdit, onDelete, canUpdate = true, canDelete = true }: ColumnsProps): ColumnDef<Area>[] => [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => (
      <div
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-800 via-green-600 to-green-400 text-[11px] font-bold text-white ring-1 ring-green-900/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.35),0_3px_6px_rgba(0,0,0,0.3)]"
        title={`Area ID: ${row.index + 1}`}
      >
        <span className="pointer-events-none absolute left-2 top-1 h-2 w-2 rounded-full bg-white/50 blur-[1px]" aria-hidden />
        <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
          {row.index + 1}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'city',
    header: 'City',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span>{row.original.city}</span>
      </div>
    ),
  },
  {
    accessorKey: 'zone',
    header: 'Zone',
  },
  {
    accessorKey: 'locality',
    header: 'Locality',
  },
  {
    accessorKey: 'subLocality',
    header: 'Sub-Locality',
     cell: ({row}) => row.original.subLocality || <span className="text-muted-foreground italic">N/A</span>
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const area = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-150"
              onClick={() => onEdit(area)}
              title="Edit Area"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all duration-150"
              onClick={() => onDelete(area)}
              title="Delete Area"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    },
  },
];
