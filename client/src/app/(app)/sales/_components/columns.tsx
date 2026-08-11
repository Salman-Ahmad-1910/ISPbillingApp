'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

interface Sale {
  id: string;
  subscriberId: string;
  subscriberName: string;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  date: string;
  companyId: string;
  isInstallment?: boolean;
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
  serialNumber?: string;
}

export function getColumns(onDelete?: (id: string) => void): ColumnDef<Sale>[] {
  return [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <div className="text-xs font-mono text-muted-foreground">
          {row.index + 1}
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
      cell: ({ row }) => (
        <div className="truncate font-medium">
          {row.original.subscriberName || 'Walk-in'}
        </div>
      ),
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Payment Method',
      cell: ({ row }) => {
        const method = row.original.paymentMethod;
        const isInstallment = row.original.isInstallment;
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline">
              {method}
            </Badge>
            {isInstallment && (
              <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                Installment
              </Badge>
            )}
          </div>
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
      id: 'serialNumber',
      header: 'SN / MAC',
      cell: ({ row }) => {
        const items = row.original.items || [];
        const serials = items
          .map(i => i.serialNumber)
          .filter(Boolean)
          .flatMap(s =>
            String(s)
              .split(',')
              .map(x => x.trim())
              .filter(Boolean),
          );
        const uniqueSerials = [...new Set(serials)];
        const serial = uniqueSerials[0] || '';
        return (
          <div className="text-xs font-mono max-w-[140px] truncate" title={uniqueSerials.join(', ')}>
            {serial || '—'}
          </div>
        );
      },
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total Amount',
      cell: ({ row }) => {
        const sale = row.original;
        const totalAmount = parseFloat(row.getValue('totalAmount'));
        const taxAmount = Number(sale.taxAmount) || 0;
        const itemsSubtotal = (sale.items || []).reduce((sum: number, item: SaleItem) => {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;
          return sum + price * qty;
        }, 0);
        const displayAmount = totalAmount || (itemsSubtotal + taxAmount);
        const formatted = new Intl.NumberFormat('en-US').format(displayAmount);
        let increasePercent = 0;
        if (sale.isInstallment && itemsSubtotal > 0) {
          increasePercent = Math.round(((displayAmount - taxAmount) / itemsSubtotal - 1) * 100);
        }
        return (
          <div className="text-right">
            <div className="font-medium">PKR {formatted}</div>
            {sale.isInstallment && increasePercent > 0 && (
              <div className="text-[10px] text-muted-foreground">+{increasePercent}% increase</div>
            )}
          </div>
        );
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
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const sale = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                row.original;
              }}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(sale.id);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
