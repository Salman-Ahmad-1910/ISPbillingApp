'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, AlertTriangle, FileSpreadsheet, FileDown } from 'lucide-react';
import type { Purchase, Vendor, Product, Company } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';

import { z } from 'zod';
import { purchaseSchema } from '@/lib/schemas';

import { DataTable } from './data-table';
import { columns as getColumns } from './columns';
import { PurchaseForm } from './purchase-form';
import { AddQuantityDialog, type AddQuantityPayload } from './add-quantity-dialog';
import { SerialEntriesTable, parseSerialNumbers } from '@/components/shared/serial-entries';
import { exportToExcel, printTableReport, fmtPKR, type ExportColumn } from '@/components/shared/table-export';
import { CollectionPagination } from '@/components/shared/collection-pagination';
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
import { smartMatch } from '@/lib/search';

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

interface ClientPageProps {
  data: Purchase[];
}

export function ClientPage({ data }: ClientPageProps) {
  const { companyId, companyName, companies } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);
  const [addQtyTarget, setAddQtyTarget] = useState<Purchase | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pageSize, setPageSize] = useState<string>('10');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const { data: vendors = [] } = useGenericQuery<any>('inventory/vendors', companyId ?? undefined);
  const { data: products = [] } = useGenericQuery<any>('inventory/products', companyId ?? undefined);

  const filteredPurchases = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(purchase =>
      smartMatch(searchTerm, [purchase.purchaseNumber, purchase.billId], [
        purchase.vendorName,
        ...(purchase.items?.map((item) => item.productName) ?? []),
      ])
    );
  }, [data, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const pagedPurchases = useMemo(() => {
    if (pageSize === 'all') return filteredPurchases;
    const size = parseInt(pageSize, 10) || 10;
    const start = (currentPage - 1) * size;
    return filteredPurchases.slice(start, start + size);
  }, [filteredPurchases, pageSize, currentPage]);

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
    onSuccess: (data: any) => {
      const created = data?.data;
      if (created && !selectedPurchase) {
        queryClient.setQueryData<Purchase[]>(['inventory/purchases', companyId], (old = []) => [created, ...old]);
      }
      queryClient.invalidateQueries({ queryKey: ['inventory/purchases', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/purchased-products', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/products', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/vendor-invoices', companyId] });
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
    mutationFn: async (purchase: Purchase) => {
      const newStatus = purchase.status === 'paid' ? 'unpaid' : 'paid';
      const response = await api.patch(`/inventory/purchases/${purchase.id}/status`, { status: newStatus });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/purchases', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/purchased-products', companyId] });
      toast({
        title: "Success",
        description: "Purchase status updated",
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
      queryClient.invalidateQueries({ queryKey: ['inventory/purchased-products', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/products', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/vendor-invoices', companyId] });
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

  const addQuantityMutation = useMutation({
    mutationFn: async ({ purchaseId, payload }: { purchaseId: string; payload: AddQuantityPayload }) => {
      const response = await api.post(`/inventory/purchases/${purchaseId}/add-quantity`, payload);
      return response.data;
    },
    onSuccess: (data: any) => {
      const updated = data?.data;
      if (updated) {
        queryClient.setQueryData<Purchase[]>(['inventory/purchases', companyId], (old = []) =>
          old.map(p => (p.id === updated.id ? updated : p)),
        );
      }
      queryClient.invalidateQueries({ queryKey: ['inventory/purchases', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/purchased-products', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/products', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory/vendor-invoices', companyId] });
      setAddQtyTarget(null);
      toast({
        title: "Success",
        description: "Quantity added to purchase",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.response?.data?.message || "Failed to add quantity",
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
    payMutation.mutate(purchase);
  };

  const handlePrint = (purchase: Purchase, format: 'a4' | 'thermal' = 'a4') => {
    const url = `/inventory/purchases/print?id=${purchase.id}&size=${format}`;
    window.open(url, '_blank');
  };

  const handleAddNew = () => {
    setSelectedPurchase(null);
    setIsFormOpen(true);
  };

  const handleDelete = (purchase: Purchase) => {
    setDeleteTarget(purchase);
  };

  const handleAddQuantity = (purchase: Purchase) => {
    setAddQtyTarget(purchase);
  };

  const handleSaveAddQuantity = (payload: AddQuantityPayload) => {
    if (addQtyTarget) {
      addQuantityMutation.mutate({ purchaseId: addQtyTarget.id, payload });
    }
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  };

  const columns = getColumns({ onEdit: handleEdit, onPay: handlePay, onPrint: handlePrint, onDelete: handleDelete, onAddQuantity: handleAddQuantity, companyName });

  const company = companyName ? ({ id: companyId, name: companyName } as unknown as Company) : null;

  const exportColumns: ExportColumn[] = [
    { key: 'billId', header: 'Bill #' },
    { key: 'vendorName', header: 'Vendor' },
    {
      key: 'items',
      header: 'Products',
      getValue: (row) => (row as Purchase).items?.map((i) => i.productName).join(', '),
    },
    { key: 'quantity', header: 'Qty', getValue: (row) => (row as Purchase).items?.reduce((s, i) => s + (i.quantity ?? 0), 0) || '' },
    { key: 'amount', header: 'Amount', getValue: (row) => fmtPKR((row as any).amount ?? (row as any).totalAmount ?? 0) },
    { key: 'date', header: 'Date' },
    { key: 'status', header: 'Status' },
  ];

  const handleExportXlsx = () => {
    exportToExcel(filteredPurchases, exportColumns, `Purchases-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Purchases');
  };

  const handleExportPdf = () => {
    printTableReport({
      title: 'Purchase List',
      subtitle: `As of ${new Date().toLocaleDateString()}`,
      company,
      columns: exportColumns,
      rows: pagedPurchases,
    });
  };

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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportXlsx}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button onClick={handleAddNew} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Purchase
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={pagedPurchases}
        getRowCanExpand={(purchase) =>
          (purchase.items || []).some((item) => parseSerialNumbers(item.serialNumber).length > 1)
        }
        renderExpanded={(purchase) => {
          const entries = [];
          for (const item of purchase.items || []) {
            for (const sn of parseSerialNumbers(item.serialNumber)) {
              entries.push({
                key: `${item.productId}-${sn}`,
                productName: item.productName,
                serialNumber: sn,
                price: item.purchasePrice,
              });
            }
          }
          return <SerialEntriesTable entries={entries} />;
        }}
      />

      <CollectionPagination
        total={filteredPurchases.length}
        pageSize={pageSize}
        setPageSize={setPageSize}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-1.5 text-white shadow-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
              </div>
              <span>{selectedPurchase ? `Edit Purchase: ${selectedPurchase.purchaseNumber}` : 'Add New Purchase'}</span>
            </DialogTitle>
          </DialogHeader>
          <PurchaseForm
            purchase={selectedPurchase}
            vendors={vendors}
            products={products}
            purchases={data}
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

      <AddQuantityDialog
        purchase={addQtyTarget}
        open={!!addQtyTarget}
        onOpenChange={(open) => !open && setAddQtyTarget(null)}
        onSave={handleSaveAddQuantity}
        isSaving={addQuantityMutation.isPending}
      />

    </div>
  );
}