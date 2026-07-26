'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { FileText, CalendarIcon, Eye, Download, Printer, BarChart3, ClipboardCheck, ScrollText, Search, DollarSign, Loader2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AccountEntryPrintDialog } from './_components/account-entry-print-dialog';

interface AccountHead {
  id: string;
  masterAccount: string;
  accountType: string;
}

interface SubHead {
  id: string;
  subMasterAccount: string;
  masterAccountId: string;
  masterAccount: string;
  accountType: string;
}

interface TransactionType {
  id: string;
  paymentChannel: string;
  transaction: string;
}

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

export default function AccountReportsPage() {
  const { companyId } = useCompany();

  const { data: apiEntries = [], isLoading } = useGenericQuery<any>('accounts/entries', companyId ?? undefined);
  const { data: apiHeads = [] } = useGenericQuery<any>('accounts/heads', companyId ?? undefined);
  const { data: apiSubHeads = [] } = useGenericQuery<any>('accounts/sub-heads', companyId ?? undefined);
  const { data: apiTxnTypes = [] } = useGenericQuery<any>('billing/transaction-types', companyId ?? undefined);

  const [entriesList, setEntriesList] = useState<AccountEntry[]>([]);
  const [headsList, setHeadsList] = useState<AccountHead[]>([]);
  const [subHeadsList, setSubHeadsList] = useState<SubHead[]>([]);
  const [txnTypesList, setTxnTypesList] = useState<TransactionType[]>([]);

  useEffect(() => {
    if (Array.isArray(apiEntries) && apiEntries.length > 0) setEntriesList(apiEntries);
  }, [apiEntries]);
  useEffect(() => {
    if (Array.isArray(apiHeads) && apiHeads.length > 0) setHeadsList(apiHeads);
  }, [apiHeads]);
  useEffect(() => {
    if (Array.isArray(apiSubHeads) && apiSubHeads.length > 0) setSubHeadsList(apiSubHeads);
  }, [apiSubHeads]);
  useEffect(() => {
    if (Array.isArray(apiTxnTypes) && apiTxnTypes.length > 0) setTxnTypesList(apiTxnTypes);
  }, [apiTxnTypes]);

  // Filters
  const [filterHead, setFilterHead] = useState('All');
  const [filterSubHead, setFilterSubHead] = useState('All');
  const [filterUser, setFilterUser] = useState('All');
  const [filterTxnType, setFilterTxnType] = useState('All');
  const [fromDate, setFromDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [toDateOpen, setToDateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showReport, setShowReport] = useState(false);

  // Print single entry dialog
  const [printEntry, setPrintEntry] = useState<AccountEntry | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  const usersList = useMemo(() => {
    const names = entriesList.map(e => e.addBy).filter(Boolean);
    return [...new Set(names)];
  }, [entriesList]);

  const getHeadName = (headId: string) => headsList.find(h => h.id === headId)?.masterAccount || headId;
  const getSubHeadName = (subHeadId: string) => subHeadsList.find(s => s.id === subHeadId)?.subMasterAccount || subHeadId;
  const getTxnTypeName = (txnTypeId: string) => txnTypesList.find(t => t.id === txnTypeId)?.paymentChannel || txnTypeId;

  // Filtering
  const filteredData = useMemo(() => {
    return entriesList.filter(e => {
      if (filterHead !== 'All' && e.head !== filterHead) return false;
      if (filterSubHead !== 'All' && e.subHead !== filterSubHead) return false;
      if (filterUser !== 'All' && e.addBy !== filterUser) return false;
      if (filterTxnType !== 'All' && e.transactionType !== filterTxnType) return false;
      if (fromDate) {
        const from = format(fromDate, 'yyyy-MM-dd');
        if (e.date < from) return false;
      }
      if (toDate) {
        const to = format(toDate, 'yyyy-MM-dd');
        if (e.date > to) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const headName = getHeadName(e.head).toLowerCase();
        const subHeadName = getSubHeadName(e.subHead).toLowerCase();
        if (!headName.includes(q) && !subHeadName.includes(q) && !e.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [entriesList, filterHead, filterSubHead, filterUser, filterTxnType, fromDate, toDate, search, headsList, subHeadsList]);

  const totalAmount = filteredData.reduce((s, e) => s + e.amount, 0);

  const handlePrintAll = () => {
    const params = new URLSearchParams();
    if (filterHead !== 'All') params.set('head', filterHead);
    if (filterSubHead !== 'All') params.set('subHead', filterSubHead);
    if (filterUser !== 'All') params.set('user', filterUser);
    if (filterTxnType !== 'All') params.set('txnType', filterTxnType);
    if (fromDate) params.set('from', format(fromDate, 'yyyy-MM-dd'));
    if (toDate) params.set('to', format(toDate, 'yyyy-MM-dd'));
    if (search) params.set('search', search);
    window.open(`/accounts/account-reports/print?${params.toString()}`, '_blank');
  };

  const handlePrintSingle = (entry: AccountEntry) => {
    setPrintEntry(entry);
    setIsPrintDialogOpen(true);
  };

  const fd = fromDate ? format(fromDate, 'dd MMM yyyy') : '';
  const td = toDate ? format(toDate, 'dd MMM yyyy') : '';

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading account entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account Reports</h1>
          <p className="text-sm text-muted-foreground">View and print account entries by period</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-violet-500/50 via-purple-500/30 to-transparent" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Entries Found</p>
              <p className="text-2xl font-bold">{filteredData.length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">PKR {totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Period</p>
              <p className="text-lg font-bold">{fd} - {td}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Account Head</Label>
              <Select value={filterHead} onValueChange={setFilterHead}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="All">All</SelectItem>
                  {headsList.map(h => <SelectItem key={h.id} value={h.id}>{h.masterAccount}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sub Head</Label>
              <Select value={filterSubHead} onValueChange={setFilterSubHead}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="All">All</SelectItem>
                  {subHeadsList.map(s => <SelectItem key={s.id} value={s.id}>{s.subMasterAccount}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="All">All</SelectItem>
                  {usersList.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={filterTxnType} onValueChange={setFilterTxnType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="All">All</SelectItem>
                  {txnTypesList.map(t => <SelectItem key={t.id} value={t.id}>{t.paymentChannel}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !fromDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={fromDate} onSelect={(d) => { if (d) { setFromDate(d); setFromDateOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !toDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={toDate} onSelect={(d) => { if (d) { setToDate(d); setToDateOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <Button onClick={() => setShowReport(true)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
              <Eye className="mr-2 h-4 w-4" />
              Show
            </Button>
            <Button variant="outline" onClick={handlePrintAll}>
              <Printer className="mr-2 h-4 w-4" />
              Print All
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Table */}
      {showReport && (
        <Card className="transition-all duration-300 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Account Entries</h2>
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
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
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No entries found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item, idx) => (
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
                              <DropdownMenuItem onClick={() => handlePrintSingle(item)}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print Entry
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredData.length > 0 && (
              <div className="mt-4 text-right text-sm text-muted-foreground">
                Total: <span className="font-bold text-foreground">PKR {totalAmount.toLocaleString()}</span> ({filteredData.length} entries)
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Single Entry Print Dialog */}
      <AccountEntryPrintDialog
        isOpen={isPrintDialogOpen}
        onClose={() => { setIsPrintDialogOpen(false); setPrintEntry(null); }}
        entry={printEntry}
        headsList={headsList}
        subHeadsList={subHeadsList}
        txnTypesList={txnTypesList}
      />
    </div>
  );
}
