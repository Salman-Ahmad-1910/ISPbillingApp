'use client';

import { type ColumnDef } from '@tanstack/react-table';

interface Product {
  id: string;
  name: string;
  stock: number;
}

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'id',
    header: 'Product ID',
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.original.id}
      </div>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Product Name',
    cell: ({ row }) => {
      const name = row.original.name;
      return <div className="font-medium">{name}</div>;
    },
  },
  {
    accessorKey: 'stock',
    header: 'Quantity',
    cell: ({ row }) => {
      const stock = row.original.stock;
      return <span>{stock}</span>;
    },
  },
  {
    id: 'damageQuantity',
    header: 'Damage Quantity',
    cell: () => {
      return <span>0</span>;
    },
  },
];