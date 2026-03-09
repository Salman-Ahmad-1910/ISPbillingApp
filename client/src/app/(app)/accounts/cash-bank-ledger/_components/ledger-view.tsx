'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import type { LedgerEntry } from '@/lib/types';
import { ledgerEntrySchema } from '@/lib/schemas';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import { LedgerEntryForm } from '../../_components/ledger-entry-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface LedgerViewProps {
  initialData: LedgerEntry[];
  accountType: 'cash' | 'bank';
}

type LedgerEntryFormValues = z.infer<typeof ledgerEntrySchema>;

const getColumns = ({ onEdit, onDelete }: { onEdit: (entry: LedgerEntry) => void; onDelete: (entry: LedgerEntry) => void; }): ColumnDef<LedgerEntry>[] => [
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'debit',
    header: 'Debit (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('debit'));
      if (amount === 0) return '';
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right text-green-600">{formatted}</div>;
    }
  },
  {
    accessorKey: 'credit',
    header: 'Credit (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('credit'));
      if (amount === 0) return '';
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right text-red-600">{formatted}</div>;
    }
  },
  {
    accessorKey: 'balance',
    header: 'Balance (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('balance'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const entry = row.original;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(entry)}>Edit Entry</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(entry)}>
                Delete Entry
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];


export function LedgerView({ initialData, accountType }: LedgerViewProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Advanced pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageInput, setPageInput] = useState<string>('');
  const [filter, setFilter] = useState<string>('');

  const entries = useMemo(() => {
    let currentBalance = 0;
    return initialData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(entry => {
        currentBalance = currentBalance + (entry.debit || 0) - (entry.credit || 0);
        return { ...entry, balance: currentBalance };
      });
  }, [initialData]);

  const filteredData = useMemo(() => entries.filter(entry =>
    entry.description?.toLowerCase().includes(filter.toLowerCase())
  ), [entries, filter]);

  // Pagination helpers
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  };

  const getVisiblePages = () => {
    const pages = [];
    const startPage = Math.max(1, currentPage - 3);
    const endPage = Math.min(totalPages, currentPage + 3);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setPageInput(value);
    }
  };

  const handlePageSubmit = () => {
    const page = parseInt(pageInput);
    if (page && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput('');
    }
  };

  const handlePageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageSubmit();
    }
  };

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const handleSave = async (formData: LedgerEntryFormValues) => {
    setIsSaving(true);
    try {
      if (selectedEntry) {
        await api.put(`/accounts/ledger/${selectedEntry.id}?companyId=${companyId}`, {
          ...formData,
          companyId: companyId!,
          accountType
        });
        toast({ title: 'Success', description: 'Ledger entry updated successfully.' });
      } else {
        await api.post(`/accounts/ledger?companyId=${companyId}`, {
          ...formData,
          companyId: companyId!,
          accountType
        });
        toast({ title: 'Success', description: 'Ledger entry added successfully.' });
      }
      queryClient.invalidateQueries({ queryKey: [`accounts/ledger?accountType=${accountType}`, companyId] });
      setIsFormOpen(false);
      setSelectedEntry(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save ledger entry',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (entry: LedgerEntry) => {
    setSelectedEntry(entry);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (selectedEntry) {
      try {
        await api.delete(`/accounts/ledger/${selectedEntry.id}?companyId=${companyId}`);
        queryClient.invalidateQueries({ queryKey: [`accounts/ledger?accountType=${accountType}`, companyId] });
        toast({ title: 'Success', description: 'Ledger entry deleted successfully.' });
        setIsDeleteDialogOpen(false);
        setSelectedEntry(null);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.response?.data?.message || 'Failed to delete ledger entry',
        });
      }
    }
  };

  const openDeleteDialog = (entry: LedgerEntry) => {
    setSelectedEntry(entry);
    setIsDeleteDialogOpen(true);
  };


  const columns = getColumns({ onEdit: handleEdit, onDelete: openDeleteDialog });

  const table = useReactTable({
    data: getPaginatedData(),
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium capitalize">{accountType} Ledger</h3>
          <Input
            placeholder="Filter by description..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Ledger Entry</DialogTitle>
            </DialogHeader>
            <LedgerEntryForm
              entry={selectedEntry}
              onSave={handleSave}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedEntry(null);
              }}
              isSaving={isSaving}
            />
          </DialogContent>
        </Dialog>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-muted-foreground">
            <h4 className="text-lg font-medium mb-2">No {accountType} Ledger Entries</h4>
            <p className="mb-4">There are no ledger entries for this account type yet.</p>
            <Button onClick={() => setIsFormOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add First Entry
            </Button>
          </div>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    )}

    {/* Advanced Pagination */}
    <div className="flex items-center justify-between mt-4 p-4 border-t">
      <div className="text-sm text-muted-foreground">
        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
      </div>
      <div className="flex items-center gap-2">
        <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        
        {/* Page numbers - show current page ± 3 */}
        <div className="flex items-center gap-1">
          {getVisiblePages().map(page => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className="w-8 h-8 p-0"
            >
              {page}
            </Button>
          ))}
          
          {/* Show ellipsis if there are more pages */}
          {currentPage + 3 < totalPages && (
            <>
              <span className="px-2 text-muted-foreground">...</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                className="w-8 h-8 p-0"
              >
                {totalPages}
              </Button>
            </>
          )}
        </div>
        
        {/* Page input */}
        <div className="flex items-center gap-1">
          <Input
            type="text"
            placeholder="Go to"
            value={pageInput}
            onChange={handlePageInputChange}
            onKeyPress={handlePageKeyPress}
            className="w-16 h-8 text-center"
            min={1}
            max={totalPages}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handlePageSubmit}
            disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > totalPages}
            className="h-8 px-2"
          >
            Go
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
