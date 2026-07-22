'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Splitter } from '@/lib/types';
import { Pencil, Trash2, SplitSquareHorizontal, MapPin, RadioTower, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ColumnsProps {
  onEdit: (splitter: Splitter) => void;
  onDelete: (splitter: Splitter) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Splitter>[] => [
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
        <SplitSquareHorizontal className="h-3.5 w-3.5 text-amber-500" />
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
    accessorKey: 'oltId',
    header: 'Parent OLT',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <RadioTower className="h-3 w-3" />
        {row.original.oltId}
      </div>
    ),
  },
  {
    accessorKey: 'totalPorts',
    header: 'Total Ports',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 justify-center tabular-nums">
        <Plug className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-semibold">{row.original.totalPorts}</span>
      </div>
    ),
  },
  {
    accessorKey: 'availablePorts',
    header: 'Available',
    cell: ({ row }) => (
      <div className="text-center font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
        {row.original.availablePorts}
      </div>
    ),
  },
  {
    header: 'Utilization',
    cell: ({ row }) => {
      if (row.original.totalPorts === 0) {
        return (
          <div className="flex items-center gap-2">
            <Progress value={0} className="w-24" />
            <span className="text-xs tabular-nums text-muted-foreground">0%</span>
          </div>
        )
      }
      const utilization = ((row.original.totalPorts - row.original.availablePorts) / row.original.totalPorts) * 100;
      const barColor = utilization > 80 ? 'bg-rose-500' : utilization > 50 ? 'bg-amber-500' : 'bg-emerald-500';
      return (
        <div className="flex items-center gap-2">
          <Progress value={utilization} className={`w-24 [&>[role=progressbar]]:${barColor}`} />
          <span className="text-xs tabular-nums text-muted-foreground">{utilization.toFixed(0)}%</span>
        </div>
      )
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const splitter = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 transition-all duration-300 hover:scale-110"
            onClick={() => onEdit(splitter)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 transition-all duration-300 hover:scale-110"
            onClick={() => onDelete(splitter)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      );
    },
  },
];
