'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, ShoppingCart, Store } from 'lucide-react';
import type { VendorInvoice, Vendor, Product } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';

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
}

export function ClientPage({ data }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  }, [searchTerm, vendorFilter, pageSize]);

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

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete, onPrint: handlePrint, products });

  return (
    <div className="space-y-4">
      {/* Header with search, filters and add button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
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
          <div className="w-48">
            <SearchableDropdown
              icon={Store}
              label="Vendor"
              color="text-amber-500"
              items={[{ id: 'all', name: 'All Vendors' }, ...vendors.map((vendor) => ({ id: vendor.id, name: vendor.name }))]}
              value={vendorFilter}
              onValueChange={setVendorFilter}
              placeholder="Filter by vendor..."
              allowClear={false}
            />
          </div>
        </div>
        <Button onClick={handleAddNew} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Buy a Product
        </Button>
      </div>

      {/* Data Table - flattened so each SN is a separate row */}
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
            for (const sn of parseSerialNumbers(item.serialNumber)) {
              entries.push({
                key: `${item.productId}-${sn}`,
                productName: item.productName,
                serialNumber: sn,
                price: item.purchasePrice ?? item.unitPrice,
              });
            }
          }
          return <SerialEntriesTable entries={entries} />;
        }}
      />

      <CollectionPagination
        total={flatRows.length}
        pageSize={pageSize}
        setPageSize={setPageSize}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

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
