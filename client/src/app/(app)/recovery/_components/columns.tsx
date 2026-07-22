'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

interface RecoveryTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  date: string;
  officerId: string;
  createdAt: string;
}

export const columns: ColumnDef<RecoveryTransaction>[] = [
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
      const date = row.original.date || row.original.createdAt;
      return date ? new Date(date).toLocaleDateString() : 'N/A';
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.type;
      return (
        <Badge
          variant={type === 'credit' ? 'default' : 'secondary'}
          className={type === 'credit' ? 'bg-green-600' : 'bg-red-600'}
        >
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
];
