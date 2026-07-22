'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

interface Sale {
  id: string;
  subscriberId: string;
  subscriberName: string;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  date: string;
  companyId: string;
  items: SaleItem[];
}

interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  saleTax?: number;
  wthTax?: number;
}

export function getColumns(): ColumnDef<Sale>[] {
  return [
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
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => {
        const date = row.original.date;
        return date ? new Date(date).toLocaleDateString() : 'N/A';
      },
    },
    {
      accessorKey: 'subscriberName',
      header: 'Customer',
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Payment Method',
      cell: ({ row }) => {
        const method = row.original.paymentMethod;
        return (
          <Badge variant="outline">
            {method}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'items',
      header: 'Items',
      cell: ({ row }) => {
        const items = row.original.items || [];
        const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        return (
          <div className="text-sm">
            {totalQty} item{totalQty !== 1 ? 's' : ''}
            <div className="text-xs text-muted-foreground">
              {items.slice(0, 2).map(item => `${item.productName} x${item.quantity}`).join(', ')}
              {items.length > 2 && '...'}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total Amount',
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('totalAmount'));
        const formatted = new Intl.NumberFormat('en-US').format(amount);
        return <div className="text-right font-medium">PKR {formatted}</div>;
      },
    },
    {
      accessorKey: 'taxAmount',
      header: 'Tax',
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('taxAmount'));
        const formatted = new Intl.NumberFormat('en-US').format(amount);
        return <div className="text-right text-sm text-muted-foreground">PKR {formatted}</div>;
      },
    },
  ];
}
