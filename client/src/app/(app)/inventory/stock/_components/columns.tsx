'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

// One purchase line ("version") of a product. Purchase records are static, so
// each line keeps the quantity, serial numbers and models exactly as recorded.
export interface PurchasedProductLine {
  purchaseItemId: string;
  id: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  unitType: string;
  serialNumber: string;
  model: string;
  billId: string;
  purchaseNumber: string;
  vendorName: string;
  purchaseDate: string;
  batch: string;
  createdAt: string;
}

// One row per distinct product. Stock is derived (purchased - sold) and matches
// the number shown on the POS page.
export interface StockProduct {
  purchaseItemId: string;
  id: string;
  name: string;
  price: number;
  stock: number;
  totalPurchased: number;
  totalSold: number;
  unitType: string;
  taxPercent: number;
  purchasePrice: number;
  billId: string;
  purchaseNumber: string;
  vendorName: string;
  purchaseDate: string;
  batch: string;
  serialNumber: string;
  model?: string;
  image?: string;
  lines: PurchasedProductLine[];
}

function countSNs(raw: string | undefined): number {
  if (!raw) return 0;
  return raw.split(/[\s,\-]+/).map(s => s.trim()).filter(Boolean).length;
}

export const columns: ColumnDef<StockProduct>[] = [
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
    id: 'versions',
    header: 'Purchases',
    cell: ({ row }) => {
      const count = row.original.lines?.length || 0;
      if (count <= 1) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <Badge variant="secondary" className="cursor-pointer">
          {count} entries
        </Badge>
      );
    },
  },
  {
    accessorKey: 'vendorName',
    header: 'Vendor',
    cell: ({ row }) => row.original.vendorName || '—',
  },
  {
    accessorKey: 'purchaseDate',
    header: 'Last Purchased',
    cell: ({ row }) => row.original.purchaseDate || '—',
  },
  {
    accessorKey: 'totalPurchased',
    header: 'Purchased',
    cell: ({ row }) => (
      <div className="text-right font-mono text-xs">{row.original.totalPurchased}</div>
    ),
  },
  {
    accessorKey: 'totalSold',
    header: 'Sold',
    cell: ({ row }) => (
      <div className="text-right font-mono text-xs">{row.original.totalSold}</div>
    ),
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