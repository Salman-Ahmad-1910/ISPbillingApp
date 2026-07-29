'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { BarChartBig, CalendarIcon, Eye, Download, Printer, FileText, DollarSign, ClipboardCheck, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Company } from '@/lib/types';
import { OneDayBalancePrintDialog } from './_components/one-day-balance-print-dialog';

interface AccountEntry {
  id: string;
  head: string;
  subHead: string;
  description: string;
  date: string;
  addBy: string;
  editBy: string;
  amount: number;
  transactionType: string;
}

interface AccountHead { id: string; masterAccount: string; accountType: string; }
interface SubHead { id: string; subMasterAccount: string; masterAccountId: string; }
interface TransactionType { id: string; paymentChannel: string; }

export default function OneDayBalanceSheetPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: apiEntries = [], isLoading } = useGenericQuery<any>('accounts/entries', companyId ?? undefined);
  const { data: apiHeads = [] } = useGenericQuery<any>('accounts/heads', companyId ?? undefined);
  const { data: apiSubHeads = [] } = useGenericQuery<any>('accounts/sub-heads', companyId ?? undefined);
  const { data: apiTxnTypes = [] } = useGenericQuery<any>('billing/transaction-types', companyId ?? undefined);
  const { data: companiesData = [] } = useGenericQuery<Company>('admin/companies', companyId ?? undefined);

  const headsList: AccountHead[] = useMemo(() => Array.isArray(apiHeads) ? apiHeads : [], [apiHeads]);
  const subHeadsList: SubHead[] = useMemo(() => Array.isArray(apiSubHeads) ? apiSubHeads : [], [apiSubHeads]);
  const txnTypesList: TransactionType[] = useMemo(() => Array.isArray(apiTxnTypes) ? apiTxnTypes : [], [apiTxnTypes]);
  const entriesList: AccountEntry[] = useMemo(() => Array.isArray(apiEntries) ? apiEntries : [], [apiEntries]);

  const company = (companiesData || []).find((c: any) => c.id === companyId);
  const logoUrl = company?.logo ? `${api?.defaults?.baseURL}/uploads/company_images/${company.id}` : null;
  const stampUrl = company?.stamp ? `${api?.defaults?.baseURL}/uploads/company_stamps/${company.id}` : null;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [filterHead, setFilterHead] = useState('All');
  const [filterSubHead, setFilterSubHead] = useState('All');
  const [showReport, setShowReport] = useState(false);

  // Edit state
  const [editingEntry, setEditingEntry] = useState<AccountEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formHeadId, setFormHeadId] = useState('');
  const [formSubHeadId, setFormSubHeadId] = useState('');
  const [formDate, setFormDate] = useState<Date | undefined>();
  const [formDateOpen, setFormDateOpen] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formTxnTypeId, setFormTxnTypeId] = useState('');

  // Print dialog state
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printEntries, setPrintEntries] = useState<AccountEntry[]>([]);

  const getHeadName = (headId: string) => headsList.find(h => h.id === headId)?.masterAccount || headId;
  const getHeadType = (headId: string) => headsList.find(h => h.id === headId)?.accountType || '';
  const getSubHeadName = (subHeadId: string) => subHeadsList.find(s => s.id === subHeadId)?.subMasterAccount || subHeadId;
  const getTxnTypeName = (txnTypeId: string) => txnTypesList.find(t => t.id === txnTypeId)?.paymentChannel || txnTypeId;

  const filteredHeadSubHeads = useMemo(() => {
    if (filterHead === 'All') return subHeadsList;
    return subHeadsList.filter(s => s.masterAccountId === filterHead);
  }, [filterHead, subHeadsList]);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const filteredData = useMemo(() => {
    return entriesList.filter(e => {
      if (e.date !== dateStr) return false;
      if (filterHead !== 'All' && e.head !== filterHead) return false;
      if (filterSubHead !== 'All' && e.subHead !== filterSubHead) return false;
      return true;
    });
  }, [entriesList, dateStr, filterHead, filterSubHead]);

  const totalAmount = filteredData.reduce((s, e) => s + e.amount, 0);

  const subHeadOptions = useMemo(() => {
    if (!formHeadId) return [];
    return subHeadsList.filter(s => s.masterAccountId === formHeadId);
  }, [formHeadId, subHeadsList]);

  const openEditDialog = (entry: AccountEntry) => {
    setEditingEntry(entry);
    setFormHeadId(entry.head);
    setFormSubHeadId(entry.subHead);
    setFormDate(new Date(entry.date));
    setFormDescription(entry.description);
    setFormAmount(String(entry.amount));
    setFormTxnTypeId(entry.transactionType);
    setIsEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingEntry || !formHeadId || !formSubHeadId || !formAmount) return;
    try {
      await api.put(`/accounts/entries/${editingEntry.id}`, {
        head: formHeadId,
        subHead: formSubHeadId,
        description: formDescription,
        date: formDate ? format(formDate, 'yyyy-MM-dd') : editingEntry.date,
        addBy: editingEntry.addBy,
        editBy: 'Admin',
        amount: parseFloat(formAmount),
        transactionType: formTxnTypeId,
      });
      queryClient.invalidateQueries({ queryKey: ['accounts/entries', companyId] });
      toast({ title: 'Success', description: 'Entry updated.' });
      setIsEditDialogOpen(false);
      setEditingEntry(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to update' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/accounts/entries/${id}`);
      queryClient.invalidateQueries({ queryKey: ['accounts/entries', companyId] });
      toast({ title: 'Success', description: 'Entry deleted.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to delete' });
    }
  };

  const handlePrintSingle = (entry: AccountEntry) => {
    setPrintEntries([entry]);
    setIsPrintDialogOpen(true);
  };

  const handlePrintAll = () => {
    const params = new URLSearchParams();
    params.set('date', dateStr);
    params.set('head', filterHead);
    params.set('subHead', filterSubHead);
    window.open(`/accounts/one-day-balance-sheet/print?${params.toString()}`, '_blank');
  };

  const handleExcel = () => {
    if (filteredData.length === 0) return;
    const headers = ['Date', 'Head', 'Sub Head', 'Description', 'Amount', 'Transaction Type', 'Add By'];
    const rows = filteredData.map(e => [
      e.date, getHeadName(e.head), getSubHeadName(e.subHead), e.description,
      e.amount.toFixed(2), getTxnTypeName(e.transactionType), e.addBy,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `od-balance-sheet-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fd = format(selectedDate, 'dd MMM yyyy');

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-report, .print-report * { visibility: visible; }
          .print-report { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex items-center gap-3 no-print">
        <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm">
          <BarChartBig className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">One Day Balance Sheet</h1>
          <p className="text-sm text-muted-foreground">View all account entries for a specific day</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-teal-500/50 via-emerald-500/30 to-transparent no-print" />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Report Date</p>
              <p className="text-lg font-bold">{fd}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Entries</p>
              <p className="text-2xl font-bold">{filteredData.length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">PKR {totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="no-print transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Account Head</Label>
              <Select value={filterHead} onValueChange={(v) => { setFilterHead(v); setFilterSubHead('All'); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="All">All Heads</SelectItem>
                  {headsList.map(h => <SelectItem key={h.id} value={h.id}>{h.masterAccount}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sub Head</Label>
              <Select value={filterSubHead} onValueChange={setFilterSubHead}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="All">All Sub Heads</SelectItem>
                  {filteredHeadSubHeads.map(s => <SelectItem key={s.id} value={s.id}>{s.subMasterAccount}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedDate} onSelect={(d) => { if (d) { setSelectedDate(d); setDateOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end">
              <Button onClick={() => setShowReport(true)} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                <Eye className="mr-2 h-4 w-4" />
                Show
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report */}
      {showReport && (
        <div className="print-report">
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">OD Balance Sheet</h2>
                  <p className="text-sm text-muted-foreground mt-1">All entries for {fd}</p>
                </div>
                <div className="flex gap-2 no-print">
                  <Button variant="outline" size="sm" onClick={handlePrintAll}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExcel}>
                    <Download className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                </div>
              </div>

              {filteredData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg">No entries found for {fd}.</p>
                  <p className="text-sm mt-2">Try selecting a different date or removing filters.</p>
                </div>
              ) : (
                <div className="min-w-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Head</TableHead>
                        <TableHead>Sub Head</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount (PKR)</TableHead>
                        <TableHead>Transaction Type</TableHead>
                        <TableHead>Add By</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell className="font-medium">{getHeadName(item.head)}</TableCell>
                          <TableCell>{getSubHeadName(item.subHead)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                          <TableCell className="font-semibold">{item.amount.toLocaleString()}</TableCell>
                          <TableCell>{getTxnTypeName(item.transactionType)}</TableCell>
                          <TableCell>{item.addBy}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(item)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit Entry
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrintSingle(item)}>
                                  <Printer className="mr-2 h-4 w-4" />
                                  Print Entry
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Entry
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {filteredData.length > 0 && (
                <div className="mt-4 text-right text-sm text-muted-foreground">
                  Total: <span className="font-bold text-foreground">PKR {totalAmount.toLocaleString()}</span> ({filteredData.length} entries)
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Entry Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) { setIsEditDialogOpen(false); setEditingEntry(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Account Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Head</Label>
                <Select value={formHeadId} onValueChange={(v) => { setFormHeadId(v); const m = subHeadsList.filter(s => s.masterAccountId === v); setFormSubHeadId(m.length > 0 ? m[0].id : ''); }}>
                  <SelectTrigger><SelectValue placeholder="Select head" /></SelectTrigger>
                  <SelectContent portal={false}>
                    {headsList.map(h => <SelectItem key={h.id} value={h.id}>{h.masterAccount}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sub Account Head</Label>
                <Select value={formSubHeadId} onValueChange={setFormSubHeadId} disabled={!formHeadId}>
                  <SelectTrigger><SelectValue placeholder="Select sub head" /></SelectTrigger>
                  <SelectContent portal={false}>
                    {subHeadOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.subMasterAccount}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover open={formDateOpen} onOpenChange={setFormDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formDate ? format(formDate, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={formDate} onSelect={(d) => { setFormDate(d); setFormDateOpen(false); }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Enter description..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" placeholder="Enter amount" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select value={formTxnTypeId} onValueChange={setFormTxnTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent portal={false}>
                    {txnTypesList.map(t => <SelectItem key={t.id} value={t.id}>{t.paymentChannel}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingEntry(null); }}>Cancel</Button>
              <Button onClick={handleEditSave} disabled={!formHeadId || !formSubHeadId || !formAmount} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <OneDayBalancePrintDialog
        key={isPrintDialogOpen ? (printEntries.length === 1 ? printEntries[0].id : 'bulk') : 'closed'}
        isOpen={isPrintDialogOpen}
        onClose={() => { setIsPrintDialogOpen(false); setPrintEntries([]); }}
        entries={printEntries}
        dateLabel={fd}
        headsList={headsList}
        subHeadsList={subHeadsList}
        txnTypesList={txnTypesList}
      />
    </div>
  );
}
