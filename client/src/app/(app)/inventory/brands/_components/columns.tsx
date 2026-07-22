'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Brand } from '@/lib/types';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BrandColumnsProps {
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => void;
}

export const columns = ({ onEdit, onDelete }: BrandColumnsProps): ColumnDef<Brand>[] => [
  {
    accessorKey: 'id',
    header: 'Brand ID',
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.original.id}
      </div>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Brand',
    cell: ({ row }) => {
      const name = row.original.name;
      return <div className="font-medium">{name}</div>;
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const brand = row.original;
      return (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(brand)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(brand)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      );
    },
  },
];
