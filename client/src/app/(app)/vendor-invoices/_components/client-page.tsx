'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, Filter } from 'lucide-react';
import type { VendorInvoice, Vendor, Product } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';

import { z } from 'zod';
import { vendorInvoiceSchema } from '@/lib/schemas';

import { DataTable } from './data-table';
import { columns as getColumns } from './columns';
import { VendorInvoiceForm } from './vendor-invoice-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';
import { PrintDialog } from './print-dialog';

import { useQueryClient, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

type VendorInvoiceFormValues = z.infer<typeof vendorInvoiceSchema>;

interface ClientPageProps {
  data: VendorInvoice[];
}

export function ClientPage({ data }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [invoices, setInvoices] = useState<VendorInvoice[]>(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch vendors and products for the form
  const { data: vendors = [] } = useGenericQuery<Vendor>('crm/vendors', companyId ?? undefined);
  const { data: products = [] } = useGenericQuery<Product>('inventory/products', companyId ?? undefined);

  // Filter invoices based on search term and vendor filter
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice => 
        invoice.invoiceNumber.toLowerCase().includes(lowerSearch) ||
        invoice.vendorName.toLowerCase().includes(lowerSearch)
      );
    }

    if (vendorFilter && vendorFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.vendorId === vendorFilter);
    }

    return filtered;
  }, [invoices, searchTerm, vendorFilter]);

  // Create/Update invoice mutation
  const invoiceMutation = useMutation({
    mutationFn: async (values: VendorInvoiceFormValues) => {
      if (selectedInvoice) {
        // Update invoice
        const response = await api.put(`/crm/vendor-invoices/${selectedInvoice.id}`, values);
        return response.data;
      } else {
        // Create invoice
        const response = await api.post('/crm/vendor-invoices', values);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm/vendor-invoices', companyId] });
      setIsFormOpen(false);
      setSelectedInvoice(null);
      toast({
        title: "Success",
        description: selectedInvoice ? "Vendor invoice updated successfully" : "Vendor invoice created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save vendor invoice",
        variant: "destructive",
      });
    },
  });

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      await api.delete(`/crm/vendor-invoices/${invoiceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm/vendor-invoices', companyId] });
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
        description: error.response?.data?.message || "Failed to delete vendor invoice",
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

  const handlePrint = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setIsPrintDialogOpen(true);
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

  const handleAddNew = () => {
    setSelectedInvoice(null);
    setIsFormOpen(true);
  };

  const columns = getColumns({ onPrint: handlePrint, onEdit: handleEdit, onDelete: handleDelete });

  return (
    <div className="space-y-4">
      {/* Header with search, filters and add button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Invoice
        </Button>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredInvoices} />

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedInvoice ? `Edit Invoice: ${selectedInvoice.invoiceNumber}` : 'Add New Vendor Invoice'}
            </DialogTitle>
          </DialogHeader>
          <VendorInvoiceForm
            invoice={selectedInvoice}
            vendors={vendors}
            products={products}
            onSave={handleSave}
            onCancel={() => setIsFormOpen(false)}
            isSaving={isSaving}
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

      {/* Print Dialog */}
      <PrintDialog
        isOpen={isPrintDialogOpen}
        onClose={() => setIsPrintDialogOpen(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
}
