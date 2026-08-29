'use client';

import { Fragment, type ReactNode } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface ExpandableDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowCanExpand?: (row: TData) => boolean;
  renderExpanded?: (row: TData) => ReactNode;
  onRowClick?: (row: TData) => void;
  pagination?: boolean;
  emptyMessage?: string;
}

/**
 * A tanstack table that supports expanding rows. When a row is expandable the
 * whole row click toggles expansion (unless onRowClick is provided, in which
 * case row click keeps its own behaviour and the chevron toggles expansion).
 */
export function ExpandableDataTable<TData, TValue>({
  columns,
  data,
  getRowCanExpand,
  renderExpanded,
  onRowClick,
  pagination = false,
  emptyMessage = 'No results.',
}: ExpandableDataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowCanExpand: getRowCanExpand
      ? (row) => getRowCanExpand(row.original)
      : undefined,
  });

  const expandColumn: ColumnDef<TData, TValue> = {
    id: 'expand',
    header: () => null,
    cell: ({ row }) => {
      if (!row.getCanExpand()) return <span />;
      return (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation();
            row.toggleExpanded();
          }}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="sr-only">Expand</span>
        </Button>
      );
    },
  };

  const allColumns = [expandColumn, ...columns];

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && 'selected'}
                    className={
                      row.getCanExpand() && !onRowClick ? 'cursor-pointer' : ''
                    }
                    onClick={() => {
                      if (onRowClick) {
                        onRowClick(row.original);
                      } else if (row.getCanExpand()) {
                        row.toggleExpanded();
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && renderExpanded && (
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={allColumns.length} className="p-2">
                        {renderExpanded(row.original)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={allColumns.length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}