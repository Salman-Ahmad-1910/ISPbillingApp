'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Brand } from '@/lib/types';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BrandColumnsProps {
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export const columns = ({ onEdit, onDelete, canUpdate = true, canDelete = true }: BrandColumnsProps): ColumnDef<Brand>[] => [
  {
    accessorKey: 'id',
    header: 'Brand ID',
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.index + 1}
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
  ...(canUpdate || canDelete
    ? [
        {
          id: 'actions',
          header: 'Actions',
          cell: ({ row }: { row: { original: Brand } }) => {
            const brand = row.original;
            return (
              <div className="flex items-center gap-2">
                {canUpdate && (
                  <Button variant="ghost" size="sm" onClick={() => onEdit(brand)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="sm" onClick={() => onDelete(brand)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            );
          },
        } as ColumnDef<Brand>,
      ]
    : []),
];
