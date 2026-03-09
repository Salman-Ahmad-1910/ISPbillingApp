'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Invoice, Subscriber } from '@/lib/types';
import { getColumns } from './columns';
import { DataTable } from './data-table';
import { PrintDialog } from './print-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import { invoiceSchema } from '@/lib/schemas';
import { InvoiceForm } from './invoice-form';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface ClientPageProps {
  invoices: Invoice[];
  subscribers: Subscriber[];
}

export function ClientPage({ invoices: data, subscribers }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [invoices, setInvoices] = useState<Invoice[]>(data);
  const [filter, setFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Advanced pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageInput, setPageInput] = useState<string>('');

  useEffect(() => {
    setInvoices(data);
  }, [data]);

  const filteredData = invoices.filter(
    (invoice) =>
      invoice.subscriberName.toLowerCase().includes(filter.toLowerCase()) ||
      invoice.id.toLowerCase().includes(filter.toLowerCase())
  );

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

  const handlePrint = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPrintDialogOpen(true);
  };

  const handleSave = async (formData: InvoiceFormValues) => {
    setIsSaving(true);
    try {
      const subscriber = subscribers.find(s => s.id === formData.subscriberId);
      if (!subscriber) {
        toast({ variant: "destructive", title: "Error", description: "Selected subscriber not found." });
        setIsSaving(false);
        return;
      }

      if (selectedInvoice) {
        await api.put(`/billing/invoices/${selectedInvoice.id}?companyId=${companyId}`, formData);
        toast({ title: "Success", description: "Invoice updated successfully." });
      } else {
        await api.post(`/billing/invoices?companyId=${companyId}`, {
          ...formData,
          companyId: companyId!,
          subscriberName: subscriber.name,
        });
        toast({ title: "Success", description: "Invoice created successfully." });
      }
      queryClient.invalidateQueries({ queryKey: ['billing/invoices', companyId] });
      setIsFormOpen(false);
      setSelectedInvoice(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Failed to save invoice"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (selectedInvoice) {
      try {
        await api.delete(`/billing/invoices/${selectedInvoice.id}`);
        toast({ title: "Success", description: "Invoice deleted successfully." });
        queryClient.invalidateQueries({ queryKey: ['billing/invoices', companyId] });
        setIsDeleteDialogOpen(false);
        setSelectedInvoice(null);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.response?.data?.message || "Failed to delete invoice"
        });
      }
    }
  };

  const openDeleteDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDeleteDialogOpen(true);
  };

  const columns = getColumns({ onPrint: handlePrint, onEdit: handleEdit, onDelete: openDeleteDialog });

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Create and manage customer invoices."
      >
        <div className="flex items-center gap-2">
          {/* <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button> */}
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedInvoice(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Invoice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedInvoice ? 'Edit' : 'Create'} Invoice</DialogTitle>
              </DialogHeader>
              <InvoiceForm
                invoice={selectedInvoice}
                subscribers={subscribers}
                onSave={handleSave}
                onCancel={() => setIsFormOpen(false)}
                isSaving={isSaving}
              />
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Input
            placeholder="Filter by customer or invoice ID..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <DataTable columns={columns} data={getPaginatedData()} />

        {/* Advanced Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} invoices
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
      </div>

      <PrintDialog
        isOpen={isPrintDialogOpen}
        onClose={() => setIsPrintDialogOpen(false)}
        invoice={selectedInvoice}
      />
      <DeleteAlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDelete}
        itemName={`Invoice ${selectedInvoice?.id}`}
      />
    </div>
  );
}
