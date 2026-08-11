'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusCircle, Loader2, Search, ReceiptText } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { smartMatch } from '@/lib/search';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Invoice, Subscriber } from '@/lib/types';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { InvoiceForm, type InvoiceFormValues } from './invoice-form';
import { PaymentDialog } from './payment-dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

export function ClientPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoicesData, isLoading } = useGenericQuery<Invoice>('billing/invoices', companyId ?? undefined);
  const { data: subscribersData } = useGenericQuery<Subscriber>('billing/subscribers', companyId ?? undefined);

  const invoices = invoicesData || [];
  const subscribers = subscribersData || [];

  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, search]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
      if (!search.trim()) return true;
      return smartMatch(search, [inv.id], [inv.subscriberName, inv.billingPeriod, inv.batch || '']);
    });
  }, [invoices, filterStatus, search]);

  const totalAmount = useMemo(() => filteredInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0), [filteredInvoices]);
  const totalPaid = useMemo(() => filteredInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0), [filteredInvoices]);
  const totalRemaining = useMemo(() => filteredInvoices.reduce((sum, inv) => sum + (Number(inv.remainingAmount ?? inv.amount) || 0), 0), [filteredInvoices]);

  const totalPages = Math.ceil(filteredInvoices.length / pageSize);
  const paginatedData = filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getVisiblePages = () => {
    const pages = [];
    const startPage = Math.max(1, currentPage - 3);
    const endPage = Math.min(totalPages, currentPage + 3);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) setPageInput(value);
  };

  const handlePageSubmit = () => {
    const page = parseInt(pageInput);
    if (page && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput('');
    }
  };

  const handlePageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePageSubmit();
  };

  const openCreate = () => {
    setSelectedInvoice(null);
    setIsFormOpen(true);
  };

  const openEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleSave = async (data: InvoiceFormValues) => {
    if (!companyId) return;
    setIsSaving(true);
    try {
      const payload = {
        ...(selectedInvoice ? { id: selectedInvoice.id } : {}),
        subscriberId: data.subscriberId,
        subscriberName: subscribers.find(s => s.id === data.subscriberId)?.name || '',
        amount: data.amount,
        paidAmount: selectedInvoice?.paidAmount || 0,
        remainingAmount: selectedInvoice?.remainingAmount ?? data.amount,
        dueDate: data.dueDate,
        status: data.status,
        billingPeriod: `${data.billingMonth} ${data.billingYear}`,
        batch: data.batch || undefined,
      };

      if (selectedInvoice) {
        await api.put(`/billing/invoices/${selectedInvoice.id}`, payload);
      } else {
        await api.post('/billing/invoices', payload);
      }

      toast({ title: 'Success', description: selectedInvoice ? 'Invoice updated successfully.' : 'Invoice created successfully.' });
      setIsFormOpen(false);
      setSelectedInvoice(null);
      queryClient.invalidateQueries({ queryKey: ['billing/invoices', companyId] });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to save invoice' });
    } finally {
      setIsSaving(false);
    }
  };

  const openPay = (invoice: Invoice) => {
    setPayingInvoice(invoice);
    setIsPaymentOpen(true);
  };

  const handlePay = async ({ amount, method }: { amount: number; method: string }) => {
    if (!payingInvoice) return;
    setIsProcessing(true);
    try {
      await api.post(`/billing/payments/process`, {
        invoiceId: payingInvoice.id,
        amount,
        method,
      });
      toast({ title: 'Success', description: 'Payment recorded successfully.' });
      setIsPaymentOpen(false);
      setPayingInvoice(null);
      queryClient.invalidateQueries({ queryKey: ['billing/invoices', companyId] });
      queryClient.invalidateQueries({ queryKey: ['billing/payments', companyId] });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to record payment' });
    } finally {
      setIsProcessing(false);
    }
  };

  const openDelete = (invoice: Invoice) => {
    setDeletingInvoice(invoice);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingInvoice) return;
    try {
      await api.delete(`/billing/invoices/${deletingInvoice.id}`);
      toast({ title: 'Success', description: 'Invoice deleted successfully.' });
      setIsDeleteDialogOpen(false);
      setDeletingInvoice(null);
      queryClient.invalidateQueries({ queryKey: ['billing/invoices', companyId] });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to delete invoice' });
    }
  };

  const columns = getColumns({ onPay: openPay, onEdit: openEdit, onDelete: openDelete });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by subscriber, period..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 pl-8"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">
              {filteredInvoices.length} invoice(s) | PKR {totalAmount.toLocaleString()}
            </span>
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Billed</p>
            <p className="text-2xl font-bold">PKR {totalAmount.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Collected</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">PKR {totalPaid.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">PKR {totalRemaining.toLocaleString()}</p>
          </div>
        </div>

        <DataTable columns={columns} data={paginatedData} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show entries</span>
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {filteredInvoices.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredInvoices.length)} of {filteredInvoices.length} entries
            </span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Previous
            </Button>
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
              {currentPage + 3 < totalPages && (
                <>
                  <span className="px-2 text-muted-foreground">...</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} className="w-8 h-8 p-0">
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                placeholder="Go to"
                value={pageInput}
                onChange={handlePageInputChange}
                onKeyPress={handlePageKeyPress}
                className="w-16 h-8 text-center"
              />
              <Button
                variant="outline" size="sm"
                onClick={handlePageSubmit}
                disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > totalPages}
                className="h-8 px-2"
              >
                Go
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => !isSaving && setIsFormOpen(open)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                <ReceiptText className="h-4 w-4" />
              </div>
              {selectedInvoice ? 'Edit' : 'New'} Invoice
            </DialogTitle>
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

      <PaymentDialog
        invoice={payingInvoice}
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onConfirm={handlePay}
        isProcessing={isProcessing}
      />

      <DeleteAlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDelete}
        itemName={deletingInvoice?.subscriberName}
      />
    </>
  );
}
