'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { POP } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, RadioTower, Wifi, WifiOff, MapPin } from 'lucide-react';

interface ColumnsProps {
  onEdit: (pop: POP) => void;
  onDelete: (pop: POP) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<POP>[] => [
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
        <RadioTower className="h-3.5 w-3.5 text-rose-500" />
        {row.original.name}
      </div>
    ),
  },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {row.original.location}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      const isOnline = status === 'online';
      return (
        <Badge
          variant={isOnline ? 'default' : 'destructive'}
          className={`gap-1 px-2.5 py-0.5 transition-all duration-300 ${
            isOnline
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'
              : 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700'
          }`}
        >
          {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'lastOutage',
    header: 'Last Outage',
    cell: ({ row }) => row.original.lastOutage ? new Date(row.original.lastOutage).toLocaleString() : 'N/A',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const pop = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 transition-all duration-300 hover:scale-110"
            onClick={() => onEdit(pop)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 transition-all duration-300 hover:scale-110"
            onClick={() => onDelete(pop)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      );
    },
  },
];
