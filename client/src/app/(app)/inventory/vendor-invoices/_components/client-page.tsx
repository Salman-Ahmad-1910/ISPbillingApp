'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, Pencil, PlusCircle, Printer, RotateCcw, Search, ShoppingCart, Store, Trash2 } from 'lucide-react';
import type { VendorInvoice, Vendor, Product } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import { useCrudPermissions } from '@/hooks/usePermissions';

import { z } from 'zod';
import { vendorInvoiceSchema } from '@/lib/schemas';

import { DataTable } from './data-table';
import { columns as getColumns, flattenInvoiceItems } from './columns';
import { SerialEntriesTable, parseSerialNumbers } from '@/components/shared/serial-entries';
import { VendorInvoiceForm } from './vendor-invoice-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';
import { CollectionPagination } from '@/components/shared/collection-pagination';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';

import { useQueryClient, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { smartMatch } from '@/lib/search';

type VendorInvoiceFormValues = z.infer<typeof vendorInvoiceSchema>;

interface ClientPageProps {
  data: VendorInvoice[];
  fromDate?: string;
  toDate?: string;
  onFromDateChange?: (value: string) => void;
  onToDateChange?: (value: string) => void;
  onClearDateFilter?: () => void;
}

export function ClientPage({
  data,
  fromDate = '',
  toDate = '',
  onFromDateChange,
  onToDateChange,
  onClearDateFilter,
}: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canCreate, canUpdate, canDelete } = useCrudPermissions();
  const [invoices, setInvoices] = useState<VendorInvoice[]>(data);

  useEffect(() => {
    setInvoices(data);
  }, [data]);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageSize, setPageSize] = useState<string>('10');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fetch vendors and products for the form
  const { data: vendors = [] } = useGenericQuery<Vendor>('inventory/vendors', companyId ?? undefined);
  const { data: products = [] } = useGenericQuery<Product>('inventory/products', companyId ?? undefined);

  // Filter invoices based on search term and vendor filter
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        smartMatch(searchTerm, [invoice.invoiceNumber], [
          invoice.vendorName,
          ...(invoice.items?.map((item: any) => item.productName) ?? []),
        ])
      );
    }

    if (vendorFilter && vendorFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.vendorId === vendorFilter);
    }

    return filtered;
  }, [invoices, searchTerm, vendorFilter]);

  // Flatten invoices into one row per product (matches the table display).
  const flatRows = useMemo(() => flattenInvoiceItems(filteredInvoices), [filteredInvoices]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, vendorFilter, pageSize, fromDate, toDate]);

  const pagedRows = useMemo(() => {
    if (pageSize === 'all') return flatRows;
    const size = parseInt(pageSize, 10) || 10;
    const start = (currentPage - 1) * size;
    return flatRows.slice(start, start + size);
  }, [flatRows, pageSize, currentPage]);

  // Create/Update invoice mutation
  const invoiceMutation = useMutation({
    mutationFn: async (values: VendorInvoiceFormValues) => {
      if (selectedInvoice) {
        const response = await api.put(`/inventory/vendor-invoices/${selectedInvoice.id}`, values);
        return response.data;
      } else {
        const response = await api.post('/inventory/vendor-invoices', values);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/vendor-invoices', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/products', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/purchased-products', companyId] });
      setIsFormOpen(false);
      setSelectedInvoice(null);
      toast({
        title: "Success",
        description: selectedInvoice ? "Vendor invoice updated successfully" : "Product purchased successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.response?.data?.message || "Failed to save",
        variant: "destructive",
      });
    },
  });

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      await api.delete(`/inventory/vendor-invoices/${invoiceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/vendor-invoices', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/products', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/purchased-products', companyId] });
      setIsDeleteDialogOpen(false);
      setSelectedInvoice(null);
      toast({
        title: "Success",
        description: "Vendor invoice deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.response?.data?.message || "Failed to delete",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (values: VendorInvoiceFormValues) => {
    setIsSaving(true);
    try {
      await invoiceMutation.mutateAsync(values);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleDelete = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedInvoice) {
      await deleteInvoiceMutation.mutateAsync(selectedInvoice.id);
    }
  };

  const handlePrint = (invoice: VendorInvoice) => {
    const url = `/inventory/vendor-invoices/print?id=${invoice.id}&size=a4`;
    window.open(url, '_blank');
  };

  const handleAddNew = () => {
    setSelectedInvoice(null);
    setIsFormOpen(true);
  };

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete, onPrint: handlePrint, canUpdate, canDelete });

  // Only the vendor and date filters live in the Filters card; the search box
  // keeps its original place in the page header.
  const hasActiveFilters = (Boolean(vendorFilter) && vendorFilter !== 'all') || Boolean(fromDate) || Boolean(toDate);

  const clearFilters = () => {
    setVendorFilter('all');
    onClearDateFilter?.();
  };

  // Open the native date picker wherever the field is clicked, not just on the
  // small calendar icon.
  const openDatePicker = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
    if (typeof input.showPicker !== 'function') return;
    try {
      input.showPicker();
    } catch {
      // Some browsers only allow showPicker() from certain gestures; ignore.
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      {/* Header with search and add button (search stays in its original place) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <div className="flex items-center border rounded-md transition-colors hover:border-foreground/30 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
            <Search className="ml-2 h-4 w-4 text-muted-foreground shrink-0" />
            <input
              className="flex-1 bg-transparent border-0 outline-none px-2 py-2 text-sm h-9"
              placeholder="Search purchases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="mr-2 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() => setSearchTerm('')}
              >
                &times;
              </button>
            )}
          </div>
        </div>
        {canCreate && (
          <Button
            onClick={handleAddNew}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700 sm:w-auto"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Buy a Product
          </Button>
        )}
      </div>

      {/* Vendor and date filters in their own section */}
      <Card className="no-print transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Pick a vendor or limit results to a buying-date range.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <SearchableDropdown
                icon={Store}
                color="text-amber-500"
                items={[{ id: 'all', name: 'All Vendors' }, ...vendors.map((vendor) => ({ id: vendor.id, name: vendor.name }))]}
                value={vendorFilter}
                onValueChange={setVendorFilter}
                placeholder="All vendors"
                allowClear={false}
                className="w-full"
                inputClassName="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-invoice-from">From Date</Label>
              <Input
                id="vendor-invoice-from"
                type="date"
                className="w-full"
                value={fromDate}
                onClick={openDatePicker}
                onChange={(e) => onFromDateChange?.(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-invoice-to">To Date</Label>
              <Input
                id="vendor-invoice-to"
                type="date"
                className="w-full"
                value={toDate}
                onClick={openDatePicker}
                onChange={(e) => onToDateChange?.(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button variant="outline" size="sm" onClick={clearFilters} disabled={!hasActiveFilters}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Clear filters
            </Button>
            <span className="text-xs text-muted-foreground">
              Showing {filteredInvoices.length} of {invoices.length} invoice{invoices.length === 1 ? '' : 's'}
            </span>
            {fromDate && toDate && fromDate > toDate && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                &quot;From&quot; date is after the &quot;To&quot; date, so no invoices can match.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data table - flattened so each SN is a separate row */}
      <Card className="min-w-0 overflow-hidden transition-all duration-300 hover:shadow-md">
        <CardContent className="min-w-0 p-0">
          <div className="border-b p-4">
            <h2 className="text-sm font-semibold">Purchase Entries</h2>
            <p className="text-xs text-muted-foreground">
              {flatRows.length} entr{flatRows.length === 1 ? 'y' : 'ies'} &middot; each serial number is listed separately
            </p>
          </div>

          <div className="min-w-0 p-4">
            {/* Mobile: stacked cards so nothing slides horizontally */}
            <div className="space-y-3 lg:hidden">
              {pagedRows.length === 0 ? (
                <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                  No purchases found.
                </div>
              ) : (
                pagedRows.map((row: any) => (
                  <div key={row.invoice.id} className="rounded-lg border p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.invoice.vendorName || '—'}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.invoice.invoiceDate || '—'}
                          {row.invoice.invoiceNumber ? ` · ${row.invoice.invoiceNumber}` : ''}
                        </p>
                        {row.invoice.batch ? (
                          <p className="text-xs text-muted-foreground">Batch: {row.invoice.batch}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Print"
                          onClick={() => handlePrint(row.invoice)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Edit"
                            onClick={() => handleEdit(row.invoice)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Delete"
                            onClick={() => handleDelete(row.invoice)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-sm">
                      <p className="break-words font-medium">{row.item.productName || '—'}</p>
                      {row.item.serialNumber ? (
                        <p className="break-all font-mono text-xs text-muted-foreground">{row.item.serialNumber}</p>
                      ) : null}
                      {row.item.model ? (
                        <p className="break-words text-xs text-muted-foreground">Model: {row.item.model}</p>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm">
                      <span className="text-muted-foreground">Qty: {row.item.quantity}</span>
                      <span className="font-semibold">
                        PKR {new Intl.NumberFormat('en-US').format(Number(row.item.subtotal) || 0)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop / tablet: full table */}
            <div className="hidden min-w-0 lg:block">
              <DataTable
              columns={columns}
              data={pagedRows}
              getRowCanExpand={(row: any) => {
                const items = row.invoice?.items || [];
                let count = 0;
                for (const item of items) {
                  count += parseSerialNumbers(item.serialNumber).length;
                }
                return count > 1;
              }}
              renderExpanded={(row: any) => {
                const entries = [];
                const items = row.invoice?.items || [];
                for (const item of items) {
                  const sns = parseSerialNumbers(item.serialNumber);
                  const models = String(item.model || '')
                    .split(/[\s,\n\r\t,]+/)
                    .map((s: string) => s.trim())
                    .filter(Boolean);
                  for (let i = 0; i < sns.length; i++) {
                    entries.push({
                      key: `${item.productId}-${i}`,
                      productName: item.productName,
                      serialNumber: sns[i],
                      model: models.length === 1 ? models[0] : models[i],
                      price: item.purchasePrice ?? item.unitPrice,
                    });
                  }
                }
                return <SerialEntriesTable entries={entries} />;
              }}
              />
            </div>

            <CollectionPagination
              total={flatRows.length}
              pageSize={pageSize}
              setPageSize={setPageSize}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-1.5 text-white shadow-sm">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span>{selectedInvoice ? `Edit Vendor Invoice` : 'Buy a Product'}</span>
            </DialogTitle>
          </DialogHeader>
          <VendorInvoiceForm
            invoice={selectedInvoice}
            vendors={vendors}
            products={products}
            onSave={handleSave}
            onCancel={() => setIsFormOpen(false)}
            isSaving={isSaving}
            onSaveValidationError={(message) => {
              toast({
                title: "Validation Error",
                description: message,
                variant: "destructive",
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteAlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={confirmDelete}
        itemName={selectedInvoice?.invoiceNumber}
      />
    </div>
  );
}
