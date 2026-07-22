'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search } from 'lucide-react';
import type { Vendor } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';

import { z } from 'zod';
import { vendorSchema } from '@/lib/schemas';

import { DataTable } from './data-table';
import { columns as getColumns } from './columns';
import { VendorForm } from './vendor-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import { useQueryClient, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

type VendorFormValues = z.infer<typeof vendorSchema>;

interface ClientPageProps {
  data: Vendor[];
}

export function ClientPage({ data }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [vendors, setVendors] = useState<Vendor[]>(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filter vendors based on search term
  const filteredVendors = useMemo(() => {
    if (!searchTerm) return vendors;
    
    const lowerSearch = searchTerm.toLowerCase();
    return vendors.filter(vendor => 
      vendor.name.toLowerCase().includes(lowerSearch) ||
      vendor.contactPerson?.toLowerCase().includes(lowerSearch) ||
      vendor.email?.toLowerCase().includes(lowerSearch) ||
      vendor.phone?.includes(lowerSearch)
    );
  }, [vendors, searchTerm]);

  // Create/Update vendor mutation
  const vendorMutation = useMutation({
    mutationFn: async (values: VendorFormValues) => {
      if (selectedVendor) {
        // Update vendor
        const response = await api.put(`/inventory/vendors/${selectedVendor.id}`, values);
        return response.data;
      } else {
        // Create vendor
        const response = await api.post('/inventory/vendors', values);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/vendors', companyId] });
      setIsFormOpen(false);
      setSelectedVendor(null);
      toast({
        title: "Success",
        description: selectedVendor ? "Vendor updated successfully" : "Vendor created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save vendor",
        variant: "destructive",
      });
    },
  });

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      await api.delete(`/inventory/vendors/${vendorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/vendors', companyId] });
      setIsDeleteDialogOpen(false);
      setSelectedVendor(null);
      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete vendor",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (values: VendorFormValues) => {
    setIsSaving(true);
    try {
      await vendorMutation.mutateAsync(values);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsFormOpen(true);
  };

  const handleDelete = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedVendor) {
      await deleteVendorMutation.mutateAsync(selectedVendor.id);
    }
  };

  const handleAddNew = () => {
    setSelectedVendor(null);
    setIsFormOpen(true);
  };

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete });

  return (
    <div className="space-y-4">
      {/* Header with search and add button */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={handleAddNew} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredVendors} />

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 p-1.5 text-white shadow-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>
              </div>
              <span>{selectedVendor ? 'Edit Vendor' : 'Add New Vendor'}</span>
            </DialogTitle>
          </DialogHeader>
          <VendorForm
            vendor={selectedVendor}
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
        itemName={selectedVendor?.name}
      />
    </div>
  );
}
