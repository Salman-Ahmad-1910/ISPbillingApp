'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, AlertTriangle } from 'lucide-react';
import type { Purchase, Vendor, Product } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';

import { z } from 'zod';
import { purchaseSchema } from '@/lib/schemas';

import { DataTable } from './data-table';
import { columns as getColumns } from './columns';
import { PurchaseForm } from './purchase-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import { useQueryClient, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

interface ClientPageProps {
  data: Purchase[];
}

export function ClientPage({ data }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: vendors = [] } = useGenericQuery<any>('inventory/vendors', companyId ?? undefined);
  const { data: products = [] } = useGenericQuery<any>('inventory/products', companyId ?? undefined);

  const filteredPurchases = useMemo(() => {
    if (!searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(purchase =>
      purchase.purchaseNumber.toLowerCase().includes(lowerSearch) ||
      purchase.vendorName.toLowerCase().includes(lowerSearch) ||
      (purchase.billId || '').toLowerCase().includes(lowerSearch)
    );
  }, [data, searchTerm]);

  const purchaseMutation = useMutation({
    mutationFn: async (values: PurchaseFormValues) => {
      if (selectedPurchase) {
        const response = await api.put(`/inventory/purchases/${selectedPurchase.id}`, values);
        return response.data;
      } else {
        const response = await api.post('/inventory/purchases', values);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/purchases', companyId] });
      setIsFormOpen(false);
      setSelectedPurchase(null);
      toast({
        title: "Success",
        description: selectedPurchase ? "Purchase updated successfully" : "Purchase created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save purchase",
        variant: "destructive",
      });
    },
  });

  const payMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      const response = await api.put(`/inventory/purchases/${purchaseId}`, { status: 'paid', remainingAmount: 0 });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/purchases', companyId] });
      toast({
        title: "Success",
        description: "Purchase marked as paid",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update payment status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      const response = await api.delete(`/inventory/purchases/${purchaseId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/purchases', companyId] });
      setDeleteTarget(null);
      toast({
        title: "Success",
        description: "Purchase deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete purchase",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (values: PurchaseFormValues) => {
    setIsSaving(true);
    try {
      await purchaseMutation.mutateAsync(values);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsFormOpen(true);
  };

  const handlePay = (purchase: Purchase) => {
    payMutation.mutate(purchase.id);
  };

  const handlePrint = (purchase: Purchase) => {
    const url = `/inventory/purchases/print/${purchase.id}`;
    window.open(url, '_blank');
  };

  const handleAddNew = () => {
    setSelectedPurchase(null);
    setIsFormOpen(true);
  };

  const handleDelete = (purchase: Purchase) => {
    setDeleteTarget(purchase);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  };

  const columns = getColumns({ onEdit: handleEdit, onPay: handlePay, onPrint: handlePrint, onDelete: handleDelete });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 px-6 pt-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search purchases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Purchase
        </Button>
      </div>

      <DataTable columns={columns} data={filteredPurchases} />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPurchase ? `Edit Purchase: ${selectedPurchase.purchaseNumber}` : 'Add New Purchase'}
            </DialogTitle>
          </DialogHeader>
          <PurchaseForm
            purchase={selectedPurchase}
            vendors={vendors}
            products={products}
            onSave={handleSave}
            onCancel={() => setIsFormOpen(false)}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Purchase
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete purchase{' '}
              <strong>{deleteTarget?.purchaseNumber}</strong>? This will revert
              the stock for all items in this purchase. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}