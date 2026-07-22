'use client';

import { type ColumnDef } from '@tanstack/react-table';

interface BillRow {
  id: string;
  month: string;
  year: string;
  amount: number;
  subscribers: number;
  connectionType: string;
  sublocality: string;
  status: 'Created' | 'Deleted';
  date: string;
  createdBy: string;
}

export const getColumns = (): ColumnDef<BillRow>[] => [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'month',
    header: 'Month',
  },
  {
    accessorKey: 'year',
    header: 'Year',
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => <div className="font-medium">{row.original.amount.toLocaleString()}</div>,
  },
  {
    accessorKey: 'subscribers',
    header: 'Subscribers',
    cell: ({ row }) => <div className="text-center font-medium">{row.original.subscribers}</div>,
  },
  {
    accessorKey: 'connectionType',
    header: 'Connection Type',
    cell: ({ row }) => {
      const type = row.original.connectionType;
      const styles: Record<string, string> = {
        'Internet': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'Cable': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        'Both': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      };
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[type] || ''}`}>
          {type}
        </span>
      );
    },
  },
  {
    accessorKey: 'sublocality',
    header: 'Sublocality',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      const styles: Record<string, string> = {
        'Created': 'text-green-600',
        'Deleted': 'text-red-600',
      };
      return (
        <div className={`text-sm font-medium ${styles[status] || ''}`}>
          {status}
        </div>
      );
    },
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'createdBy',
    header: 'Created/Deleted by',
  },
];
