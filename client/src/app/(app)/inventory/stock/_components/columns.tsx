'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

interface PurchasedProduct {
  purchaseItemId: string;
  id: string;
  name: string;
  price: number;
  stock: number;
  unitType: string;
  purchasePrice: number;
  billId: string;
  purchaseNumber: string;
  vendorName: string;
  purchaseDate: string;
  batch: string;
  serialNumber: string;
}

export const columns: ColumnDef<PurchasedProduct>[] = [
  {
    id: 'index',
    header: '#',
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.index + 1}
      </div>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Product',
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'vendorName',
    header: 'Vendor',
  },
  {
    accessorKey: 'purchaseDate',
    header: 'Purchase Date',
  },
  {
    accessorKey: 'batch',
    header: 'Batch',
    cell: ({ row }) => row.original.batch || '—',
  },
  {
    accessorKey: 'serialNumber',
    header: 'SN / MAC',
    cell: ({ row }) => {
      const sn = row.original.serialNumber;
      if (!sn) return <span className="text-xs font-mono text-muted-foreground">—</span>;
      const sns = sn.split(/[\s,\-]+/).map(s => s.trim()).filter(Boolean);
      if (sns.length === 0) return <span className="text-xs font-mono text-muted-foreground">—</span>;
      const display = sns.length === 1 ? sns[0] : `${sns[0]} (1/${sns.length})`;
      return <span className="text-xs font-mono" title={sns.join(', ')}>{display}</span>;
    },
  },
  {
    accessorKey: 'stock',
    header: 'Stock',
    cell: ({ row }) => {
      const stock = Number(row.original.stock) || 0;
      return (
        <div className="text-center">
          <Badge variant={stock > 10 ? 'default' : stock > 0 ? 'secondary' : 'destructive'} className={stock > 10 ? 'bg-green-600' : ''}>
            {stock > 0 ? `${stock} in stock` : 'Out of stock'}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'price',
    header: 'Price (PKR)',
    cell: ({ row }) => {
      const amount = Number(row.original.price) || 0;
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
];
