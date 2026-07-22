'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, Filter, ShoppingCart } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);

  // Fetch vendors and products for the form
  const { data: vendors = [] } = useGenericQuery<Vendor>('inventory/vendors', companyId ?? undefined);
  const { data: products = [] } = useGenericQuery<Product>('inventory/products', companyId ?? undefined);

  // Filter invoices based on search term and vendor filter
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice => 
        invoice.vendorName.toLowerCase().includes(lowerSearch) ||
        invoice.items?.some((item: any) => item.productName.toLowerCase().includes(lowerSearch))
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
        const response = await api.put(`/inventory/vendor-invoices/${selectedInvoice.id}`, values);
        return response.data;
      } else {
        const response = await api.post('/inventory/vendor-invoices', values);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/vendor-invoices', companyId] });
      setIsFormOpen(false);
      setSelectedInvoice(null);
      toast({
        title: "Success",
        description: selectedInvoice ? "Store entry updated successfully" : "Product purchased successfully",
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
      setIsDeleteDialogOpen(false);
      setSelectedInvoice(null);
      toast({
        title: "Success",
        description: "Store entry deleted successfully",
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

  const handleAddNew = () => {
    setSelectedInvoice(null);
    setIsFormOpen(true);
  };

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete });

  return (
    <div className="space-y-4">
      {/* Header with search, filters and add button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search purchases..."
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
        <Button onClick={handleAddNew} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Buy a Product
        </Button>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredInvoices} />

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-1.5 text-white shadow-sm">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span>{selectedInvoice ? `Edit Purchase` : 'Buy a Product'}</span>
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
