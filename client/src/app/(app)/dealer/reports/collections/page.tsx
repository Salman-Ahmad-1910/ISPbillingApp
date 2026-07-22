'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Printer, Wallet, Loader2, MoreHorizontal, Pencil, Trash2, FileText, Copy, Receipt } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import type { Company } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SearchableSelect,
} from '@/components/ui/searchable-select';
import { CollectionPrintDialog } from '@/app/(app)/transaction/dealers-collections/_components/collection-print-dialog';
import type { DealerCollection } from '@/lib/types';

interface CollectionRecord {
  id: string;
  dealerId: string;
  dealerName: string;
  dealerAddress: string;
  amount: number;
  collectionDate: string;
  settlementStatus: string;
  transactionType: string;
  comment: string;
  receivedById: string;
  receivedByName: string;
}

interface AreaItem {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { id: 'pending', name: 'Unpaid' },
  { id: 'settled', name: 'Paid' },
];

export default function DealersCollectionsPage() {
  const { companyId, companies } = useCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CollectionRecord[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);

  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [toDate, setToDate] = useState<Date>(new Date());
  const [reportType, setReportType] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedLocality, setSelectedLocality] = useState<string>('all');
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('all');

  const currentCompany = companies.find((c: any) => c.id === companyId) as Company | undefined;

  // Edit state
  const [editCollection, setEditCollection] = useState<CollectionRecord | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editAmount, setEditAmount] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [editStatus, setEditStatus] = useState<'pending' | 'settled'>('pending');
  const [isSaving, setIsSaving] = useState(false);

  // Print state
  const [printCollection, setPrintCollection] = useState<DealerCollection | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printFormatChoice, setPrintFormatChoice] = useState<'a4' | 'thermal'>('a4');

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [collectionsRes, areasRes] = await Promise.all([
        api.get('/dealers/collections', { params: { companyId } }),
        api.get('/network/areas', { params: { companyId } }),
      ]);

      setData(collectionsRes.data?.data || []);
      const areaList = areasRes.data?.data || [];
      setAreas(areaList.map((a: any) => ({ id: a.id, name: a.locality || a.name })));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch data',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const filteredData = data.filter((item) => {
    const itemDate = new Date(item.collectionDate);
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const afterFrom = itemDate >= from;
    const beforeTo = itemDate <= to;
    const typeMatch = reportType === 'all' || item.settlementStatus === reportType;
    const txMatch = selectedTransactionType === 'all' || item.transactionType === selectedTransactionType;

    return afterFrom && beforeTo && typeMatch && txMatch;
  });

  const totalConnection = filteredData.length;
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  // CRUD handlers
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.delete(`/dealers/collections/${id}`);
      toast({ title: 'Deleted', description: 'Collection entry deleted.' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete entry.' });
    }
  }, [toast]);

  const handleEditOpen = useCallback((col: CollectionRecord) => {
    setEditCollection(col);
    setEditAmount(col.amount);
    setEditComment(col.comment || '');
    setEditStatus(col.settlementStatus as 'pending' | 'settled');
    setShowEditDialog(true);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editCollection) return;
    setIsSaving(true);
    try {
      await api.put(`/dealers/collections/${editCollection.id}`, {
        ...editCollection,
        amount: editAmount,
        comment: editComment,
        settlementStatus: editStatus,
      });
      toast({ title: 'Updated', description: 'Collection entry updated.' });
      setShowEditDialog(false);
      setEditCollection(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update entry.' });
    } finally {
      setIsSaving(false);
    }
  }, [editCollection, editAmount, editComment, editStatus, toast]);

  const handleToggleStatus = useCallback(async (col: CollectionRecord) => {
    const newStatus = col.settlementStatus === 'settled' ? 'pending' : 'settled';
    try {
      await api.put(`/dealers/collections/${col.id}`, {
        ...col,
        settlementStatus: newStatus,
      });
      toast({ title: 'Updated', description: `Status changed to ${newStatus}.` });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    }
  }, [toast]);

  const handlePrint = useCallback((col: CollectionRecord, format: 'a4' | 'thermal') => {
    setPrintCollection(col as DealerCollection);
    setPrintFormatChoice(format);
    setIsPrintDialogOpen(true);
  }, []);

  const exportExcel = () => {
    if (filteredData.length === 0) {
      toast({ title: 'No data', description: 'No records to export.' });
      return;
    }

    const headers = ['Dealer Name', 'Address', 'Amount', 'Transaction Type', 'Collection Date', 'Status', 'Received By'];
    const rows = filteredData.map((item) => [
      item.dealerName,
      item.dealerAddress || '',
      item.amount.toFixed(2),
      item.transactionType || 'cash',
      item.collectionDate,
      item.settlementStatus,
      item.receivedByName || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dealers-collection-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: 'Success', description: 'Report exported successfully.' });
  };

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-center gap-3 no-print">
        <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dealers Collections</h1>
          <p className="text-sm text-muted-foreground">View collections made by dealers</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-teal-500/50 via-emerald-500/30 to-transparent no-print" />

      {/* Filter Row */}
      <Card className="no-print transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* From Date */}
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !fromDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => {
                      if (date) {
                        setFromDate(date);
                        setFromDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !toDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(date) => {
                      if (date) {
                        setToDate(date);
                        setToDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Report Type */}
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Locality */}
            <div className="space-y-2">
              <Label>Locality</Label>
              <Select value={selectedLocality} onValueChange={setSelectedLocality}>
                <SelectTrigger>
                  <SelectValue placeholder="Select locality" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Localities</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={selectedTransactionType} onValueChange={setSelectedTransactionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="easypaisa">Easypaisa</SelectItem>
                  <SelectItem value="jazzcash">JazzCash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchData} disabled={loading} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold mt-1">{totalConnection}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold mt-1">PKR {totalAmount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Section */}
      <div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Dealer&apos;s Collection</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  From: {fromDate ? format(fromDate, 'dd MMM yyyy') : '...'} : To:{' '}
                  {toDate ? format(toDate, 'dd MMM yyyy') : '...'}
                </p>
              </div>
              <div className="flex gap-2 no-print">
                <Button variant="outline" onClick={exportExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm animate-pulse">Loading data...</p>
                </div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No collection records found for the selected criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Dealer Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Transaction Type</TableHead>
                    <TableHead>Collection Date</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{item.dealerName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{item.dealerAddress || '---'}</TableCell>
                      <TableCell>PKR {item.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.transactionType === 'easypaisa' ? 'default' :
                          item.transactionType === 'jazzcash' ? 'secondary' :
                          item.transactionType === 'bank' ? 'outline' : 'default'
                        }>
                          {item.transactionType || 'cash'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.collectionDate}</TableCell>
                      <TableCell className="text-xs">{item.receivedByName || '---'}</TableCell>
                      <TableCell>
                        <Badge variant={item.settlementStatus === 'settled' ? 'default' : 'secondary'}>
                          {item.settlementStatus === 'settled' ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditOpen(item)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(item)}>
                              <Receipt className="mr-2 h-4 w-4" />
                              {item.settlementStatus === 'settled' ? 'Mark Unpaid' : 'Mark Paid'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handlePrint(item, 'a4')}>
                              <FileText className="mr-2 h-4 w-4" />
                              Print Bill
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint(item, 'thermal')}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate Print
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setEditCollection(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Collection Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Bill #</Label>
                <Input value={editCollection?.id?.slice(0, 8).toUpperCase() || ''} readOnly />
              </div>
              <div className="space-y-1">
                <Label>Dealer</Label>
                <Input value={editCollection?.dealerName || ''} readOnly />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Amount (PKR)</Label>
              <Input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <SearchableSelect
                value={editStatus}
                onValueChange={(v) => { if (v) setEditStatus(v as 'pending' | 'settled'); }}
                options={STATUS_OPTIONS}
                placeholder="Select status..."
                searchPlaceholder="Search status..."
                allowClear={false}
              />
            </div>
            <div className="space-y-1">
              <Label>Comment</Label>
              <Textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
              />
            </div>
            <Button
              onClick={handleEditSave}
              disabled={isSaving || !editAmount}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <CollectionPrintDialog
        isOpen={isPrintDialogOpen}
        onClose={() => { setIsPrintDialogOpen(false); setPrintCollection(null); }}
        collection={printCollection}
        company={currentCompany}
        initialTab={printFormatChoice}
      />
    </div>
  );
}
