'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { ProductType } from '@/lib/types';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductTypeColumnsProps {
  onEdit: (productType: ProductType) => void;
  onDelete: (productType: ProductType) => void;
}

export const columns = ({ onEdit, onDelete }: ProductTypeColumnsProps): ColumnDef<ProductType>[] => [
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
    cell: ({ row }) => {
      const name = row.original.name;
      return <div className="font-medium">{name}</div>;
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const productType = row.original;
      return (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(productType)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(productType)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      );
    },
  },
];
