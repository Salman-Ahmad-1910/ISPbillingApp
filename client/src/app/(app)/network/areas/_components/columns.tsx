'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Area } from '@/lib/types';
import { Pencil, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnsProps {
    onEdit: (area: Area) => void;
    onDelete: (area: Area) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Area>[] => [
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-150"
            onClick={() => onEdit(area)}
            title="Edit Area"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all duration-150"
            onClick={() => onDelete(area)}
            title="Delete Area"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
