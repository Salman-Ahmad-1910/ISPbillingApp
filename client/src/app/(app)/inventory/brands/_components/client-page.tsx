'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search } from 'lucide-react';
import type { Brand } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';

import { z } from 'zod';
import { brandSchema } from '@/lib/schemas';

import { DataTable } from './data-table';
import { columns as getColumns } from './columns';
import { BrandForm } from './brand-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import { useQueryClient, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

type BrandFormValues = z.infer<typeof brandSchema>;

interface ClientPageProps {
  data: Brand[];
}

export function ClientPage({ data }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const filteredBrands = useMemo(() => {
    if (!searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(brand =>
      brand.name.toLowerCase().includes(lowerSearch)
    );
  }, [data, searchTerm]);

  const brandMutation = useMutation({
    mutationFn: async (values: BrandFormValues) => {
      if (selectedBrand) {
        const response = await api.put(`/inventory/brands/${selectedBrand.id}`, values);
        return response.data;
      } else {
        const response = await api.post('/inventory/brands', values);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/brands', companyId] });
      setIsFormOpen(false);
      setSelectedBrand(null);
      toast({
        title: "Success",
        description: selectedBrand ? "Brand updated successfully" : "Brand created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save brand",
        variant: "destructive",
      });
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: async (brandId: string) => {
      await api.delete(`/inventory/brands/${brandId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/brands', companyId] });
      setIsDeleteDialogOpen(false);
      setSelectedBrand(null);
      toast({
        title: "Success",
        description: "Brand deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete brand",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (values: BrandFormValues) => {
    setIsSaving(true);
    try {
      await brandMutation.mutateAsync(values);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsFormOpen(true);
  };

  const handleDelete = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedBrand) {
      await deleteBrandMutation.mutateAsync(selectedBrand.id);
    }
  };

  const handleAddNew = () => {
    setSelectedBrand(null);
    setIsFormOpen(true);
  };

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 px-6 pt-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={handleAddNew} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Brand
        </Button>
      </div>

      <DataTable columns={columns} data={filteredBrands} />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-1.5 text-white shadow-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              </div>
              <span>{selectedBrand ? 'Edit Brand' : 'Add New Brand'}</span>
            </DialogTitle>
          </DialogHeader>
          <BrandForm
            brand={selectedBrand}
            onSave={handleSave}
            onCancel={() => setIsFormOpen(false)}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={confirmDelete}
        itemName={selectedBrand?.name}
      />
    </div>
  );
}
