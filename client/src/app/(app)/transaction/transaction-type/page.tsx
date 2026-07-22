'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Loader2, Pencil, Plus, Search, Trash2, FileCog, ListChecks } from 'lucide-react';

import type { TransactionType } from '@/lib/types';

const PAYMENT_CHANNELS = [
  'Al Habib Bank',
  'Allied Bank',
  'Askari Bank',
  'Bank Al-Falah',
  'Bank Al-Habib',
  'Bank Islami',
  'Bank of Punjab',
  'Bank of Khyber',
  'Dubai Islamic Bank',
  'Faysal Bank',
  'Habib Bank (HBL)',
  'Habib Metro',
  'JS Bank',
  'MCB Bank',
  'Meezan Bank',
  'National Bank (NBP)',
  'Samba Bank',
  'Silk Bank',
  'Sindh Bank',
  'Soneri Bank',
  'Standard Chartered',
  'Summit Bank',
  'United Bank (UBL)',
  'Easypaisa',
  'JazzCash',
  'U-Paisa',
  'SadaPay',
  'NayaPay',
  'Keenu',
  'Cash',
  'Other',
];

export default function TransactionTypePage() {
  const { companyId } = useCompany();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formTransaction, setFormTransaction] = useState('');
  const [formOpeningBalance, setFormOpeningBalance] = useState(0);
  const [formTitle, setFormTitle] = useState('');
  const [formPaymentChannel, setFormPaymentChannel] = useState('');

  const { data: records = [], isLoading, refetch } = useGenericQuery<TransactionType>(
    'billing/transaction-types',
    companyId ?? undefined,
  );

  const filtered = useMemo(() => {
    const all = records as TransactionType[];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(r =>
      r.transaction.toLowerCase().includes(q) ||
      r.title?.toLowerCase().includes(q) ||
      r.paymentChannel?.toLowerCase().includes(q)
    );
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Reset to page 1 when search or pageSize changes
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((val: string) => {
    setPageSize(Number(val));
    setPage(1);
  }, []);

  const totalTypes = useMemo(() => {
    if (!Array.isArray(records)) return 0;
    return records.length;
  }, [records]);

  const openAddDialog = () => {
    setEditingId(null);
    setFormTransaction('');
    setFormOpeningBalance(0);
    setFormTitle('');
    setFormPaymentChannel('');
    setShowDialog(true);
  };

  const openEditDialog = (record: TransactionType) => {
    setEditingId(record.id);
    setFormTransaction(record.transaction);
    setFormOpeningBalance(record.openingBalance);
    setFormTitle(record.title || '');
    setFormPaymentChannel(record.paymentChannel || '');
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formTransaction.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        transaction: formTransaction.trim(),
        openingBalance: formOpeningBalance,
        title: formTitle.trim(),
        paymentChannel: formPaymentChannel,
      };
      if (editingId) {
        await api.put(`/billing/transaction-types/${editingId}`, payload);
        toast({ title: 'Success', description: 'Transaction type updated.' });
      } else {
        await api.post('/billing/transaction-types', payload);
        toast({ title: 'Success', description: 'Transaction type created.' });
      }
      setShowDialog(false);
      refetch();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to save';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction type?')) return;
    try {
      await api.delete(`/billing/transaction-types/${id}`);
      toast({ title: 'Success', description: 'Transaction type deleted.' });
      refetch();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to delete';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 p-2.5 text-white shadow-sm">
          <FileCog className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaction Type</h1>
          <p className="text-sm text-muted-foreground">Manage transaction types and payment channels.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-slate-500/50 via-slate-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <FileCog className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Transaction Types</p>
              <p className="text-2xl font-bold">{totalTypes}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Payment Channels</p>
              <p className="text-2xl font-bold">{PAYMENT_CHANNELS.length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Filtered</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{filtered.length}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openAddDialog} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search ? 'No matching transaction types found.' : 'No transaction types yet. Click "Add Transaction" to create one.'}
            </div>
          ) : (
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">ID</TableHead>
                  <TableHead className="w-1/3">Payment Channel</TableHead>
                  <TableHead className="w-1/3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-xs">{record.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{record.paymentChannel || '---'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 transition-all duration-300 hover:scale-110" onClick={() => openEditDialog(record)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive transition-all duration-300 hover:scale-110 hover:bg-destructive/10" onClick={() => handleDelete(record.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="transition-all duration-300 hover:scale-105"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="transition-all duration-300 hover:scale-105"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Transaction Type' : 'Add Transaction'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Transaction</Label>
              <Input
                value={formTransaction}
                onChange={(e) => setFormTransaction(e.target.value)}
                placeholder="e.g. Cash Collection"
              />
            </div>
            <div className="space-y-1">
              <Label>Opening Balance</Label>
              <Input
                type="number"
                value={formOpeningBalance}
                onChange={(e) => setFormOpeningBalance(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Daily cash collections from customers"
              />
            </div>
            <div className="space-y-1">
              <Label>Payment Channel / Bank</Label>
              <Select value={formPaymentChannel} onValueChange={setFormPaymentChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bank or payment channel..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {PAYMENT_CHANNELS.map((ch) => (
                    <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formTransaction.trim()}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
