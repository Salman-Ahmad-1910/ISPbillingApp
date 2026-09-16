'use client';

import type { ReactNode } from 'react';
import { type ColumnDef } from '@tanstack/react-table';

import { ExpandableDataTable } from '@/components/shared/expandable-data-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  getRowCanExpand?: (row: TData) => boolean;
  renderExpanded?: (row: TData) => ReactNode;
  pagination?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  getRowCanExpand,
  renderExpanded,
  pagination = true,
}: DataTableProps<TData, TValue>) {
  return (
    <ExpandableDataTable
      columns={columns}
      data={data}
      onRowClick={onRowClick}
      getRowCanExpand={getRowCanExpand}
      renderExpanded={renderExpanded}
      pagination={pagination}
      emptyMessage="No sales found."
    />
  );
}