'use client';

import { type ColumnDef } from '@tanstack/react-table';

export interface PurchasedProduct {
  purchaseItemId: string;
  id: string;
  name: string;
  price: number;
  stock: number;
  unitType: string;
  taxPercent: number;
  purchasePrice: number;
  billId: string;
  purchaseNumber: string;
  vendorName: string;
  purchaseDate: string;
  batch: string;
  serialNumber?: string;
}

export const columns: ColumnDef<PurchasedProduct, unknown>[] = [
  {
    accessorKey: 'billId',
    header: 'Bill ID',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.billId || row.original.purchaseNumber || '-'}</span>
    ),
  },
  {
    accessorKey: 'vendorName',
    header: 'Vendor',
    cell: ({ row }) => <span>{row.original.vendorName || '-'}</span>,
  },
  {
    accessorKey: 'purchaseDate',
    header: 'Date',
    cell: ({ row }) => <span>{row.original.purchaseDate || '-'}</span>,
  },
  {
    accessorKey: 'batch',
    header: 'Batch',
    cell: ({ row }) => <span>{row.original.batch || '-'}</span>,
  },
  {
    accessorKey: 'serialNumber',
    header: 'SN / MAC',
    cell: ({ row }) => (
      <span className="text-xs font-mono">{row.original.serialNumber || '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Product',
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'stock',
    header: 'Quantity',
    cell: ({ row }) => {
      const qty = row.original.stock;
      return (
        <span className={qty === 0 ? 'text-muted-foreground' : 'font-medium'}>
          {qty}
        </span>
      );
    },
  },
  {
    id: 'damageQuantity',
    header: 'Damage Qty',
    cell: () => <span>0</span>,
  },
  {
    accessorKey: 'purchasePrice',
    header: 'Purchase Price',
    cell: ({ row }) => {
      const amount = row.original.purchasePrice;
      return <span>PKR {new Intl.NumberFormat('en-US').format(amount)}</span>;
    },
  },
  {
    accessorKey: 'price',
    header: 'Selling Price',
    cell: ({ row }) => {
      const amount = row.original.price;
      return <span>PKR {new Intl.NumberFormat('en-US').format(amount)}</span>;
    },
  },
];
