'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search } from 'lucide-react';
import type { ProductType } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';

import { z } from 'zod';
import { productTypeSchema } from '@/lib/schemas';

import { DataTable } from './data-table';
import { columns as getColumns } from './columns';
import { ProductTypeForm } from './product-type-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import { useQueryClient, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

type ProductTypeFormValues = z.infer<typeof productTypeSchema>;

interface ClientPageProps {
  data: ProductType[];
}

export function ClientPage({ data }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const filteredProductTypes = useMemo(() => {
    if (!searchTerm) return data;

    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(pt =>
      pt.name.toLowerCase().includes(lowerSearch)
    );
  }, [data, searchTerm]);

  const productTypeMutation = useMutation({
    mutationFn: async (values: ProductTypeFormValues) => {
      if (selectedProductType) {
        const response = await api.put(`/inventory/product-types/${selectedProductType.id}`, values);
        return response.data;
      } else {
        const response = await api.post('/inventory/product-types', values);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/product-types', companyId] });
      setIsFormOpen(false);
      setSelectedProductType(null);
      toast({
        title: "Success",
        description: selectedProductType ? "Product type updated successfully" : "Product type created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save product type",
        variant: "destructive",
      });
    },
  });

  const deleteProductTypeMutation = useMutation({
    mutationFn: async (productTypeId: string) => {
      await api.delete(`/inventory/product-types/${productTypeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/product-types', companyId] });
      setIsDeleteDialogOpen(false);
      setSelectedProductType(null);
      toast({
        title: "Success",
        description: "Product type deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete product type",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (values: ProductTypeFormValues) => {
    setIsSaving(true);
    try {
      await productTypeMutation.mutateAsync(values);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (productType: ProductType) => {
    setSelectedProductType(productType);
    setIsFormOpen(true);
  };

  const handleDelete = (productType: ProductType) => {
    setSelectedProductType(productType);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedProductType) {
      await deleteProductTypeMutation.mutateAsync(selectedProductType.id);
    }
  };

  const handleAddNew = () => {
    setSelectedProductType(null);
    setIsFormOpen(true);
  };

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search product types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={handleAddNew} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Product Type
        </Button>
      </div>

      <DataTable columns={columns} data={filteredProductTypes} />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-1.5 text-white shadow-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              </div>
              <span>{selectedProductType ? 'Edit Product Type' : 'Add New Product Type'}</span>
            </DialogTitle>
          </DialogHeader>
          <ProductTypeForm
            productType={selectedProductType}
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
        itemName={selectedProductType?.name}
      />
    </div>
  );
}
