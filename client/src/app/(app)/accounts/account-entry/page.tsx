'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { BookOpen, PlusCircle, MoreHorizontal, Edit3, Trash2, Search, CalendarIcon, Layers, DollarSign, FileText, Loader2 } from 'lucide-react';
import type { Staff } from '@/lib/types';

const accountHeads = ['Asset', 'Liability', 'Income', 'Expense', 'Equity'];
const accountSubHeads: Record<string, string[]> = {
  Asset: ['Cash', 'Bank', 'Accounts Receivable', 'Inventory', 'Fixed Assets'],
  Liability: ['Accounts Payable', 'Loans', 'Taxes Payable'],
  Income: ['Service Revenue', 'Interest Income', 'Other Income'],
  Expense: ['Salaries', 'Rent', 'Utilities', 'Office Expenses', 'Travel'],
  Equity: ['Capital', 'Retained Earnings', 'Drawings'],
};
const transactionTypes = ['Debit', 'Credit'];
const filterByOptions = ['All', 'Add By', 'Edit By'];

interface AccountEntry {
  id: string;
  head: string;
  subHead: string;
  comments: string;
  date: string;
  addBy: string;
  editBy: string;
  amount: number;
}

export default function AccountEntryPage() {
  const { companyId } = useCompany();

  const { data: apiEntries = [], isLoading } = useGenericQuery<any>('accounts/entries', companyId ?? undefined);
  const { data: staff = [] } = useGenericQuery<Staff>('hr/staff', companyId ?? undefined);
  const [entriesList, setEntriesList] = useState<AccountEntry[]>([]);
  const usersList = useMemo(() => {
    if (!Array.isArray(staff)) return [];
    return staff.map((s: any) => s.name).filter(Boolean);
  }, [staff]);

  useEffect(() => {
    if (Array.isArray(apiEntries) && apiEntries.length > 0) {
      setEntriesList(apiEntries);
    }
  }, [apiEntries]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountEntry | null>(null);

  const [formHead, setFormHead] = useState('');
  const [formSubHead, setFormSubHead] = useState('');
  const [formDate, setFormDate] = useState<Date | undefined>(undefined);
  const [formDateOpen, setFormDateOpen] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formTxnType, setFormTxnType] = useState('Debit');

  const [filterHead, setFilterHead] = useState('All');
  const [filterSubHead, setFilterSubHead] = useState('All');
  const [filterUser, setFilterUser] = useState('All');
  const [filterFromDate, setFilterFromDate] = useState<Date | undefined>(undefined);
  const [filterFromDateOpen, setFilterFromDateOpen] = useState(false);
  const [filterToDate, setFilterToDate] = useState<Date | undefined>(undefined);
  const [filterToDateOpen, setFilterToDateOpen] = useState(false);
  const [filterBy, setFilterBy] = useState('All');

  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  const subHeadOptions = formHead ? accountSubHeads[formHead] || [] : [];

  const filteredData = useMemo(() => {
    return entriesList.filter((e) => {
      if (filterHead !== 'All' && e.head !== filterHead) return false;
      if (filterSubHead !== 'All' && e.subHead !== filterSubHead) return false;
      if (filterUser !== 'All' && e.addBy !== filterUser && e.editBy !== filterUser) return false;
      if (filterBy === 'Add By' && filterUser !== 'All' && e.addBy !== filterUser) return false;
      if (filterBy === 'Edit By' && filterUser !== 'All' && e.editBy !== filterUser) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.head.toLowerCase().includes(q) && !e.subHead.toLowerCase().includes(q) && !e.comments.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [entriesList, filterHead, filterSubHead, filterUser, filterBy, search]);

  const totalPages = Math.ceil(filteredData.length / parseInt(pageSize));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * parseInt(pageSize),
    currentPage * parseInt(pageSize)
  );

  const openAddDialog = () => {
    setEditingItem(null);
    setFormHead('');
    setFormSubHead('');
    setFormDate(undefined);
    setFormDescription('');
    setFormAmount('');
    setFormTxnType('Debit');
    setDialogOpen(true);
  };

  const openEditDialog = (item: AccountEntry) => {
    setEditingItem(item);
    setFormHead(item.head);
    setFormSubHead(item.subHead);
    setFormDate(new Date(item.date));
    setFormDescription(item.comments);
    setFormAmount(String(item.amount));
    setFormTxnType('Debit');
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formHead || !formSubHead || !formAmount) return;
    const newEntry: AccountEntry = {
      id: editingItem ? editingItem.id : String(Date.now()),
      head: formHead,
      subHead: formSubHead,
      comments: formDescription,
      date: formDate ? format(formDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
      addBy: editingItem ? editingItem.addBy : 'Admin',
      editBy: editingItem ? 'Admin' : '-',
      amount: parseFloat(formAmount),
    };
    if (editingItem) {
      setEntriesList(entriesList.map((e) => e.id === editingItem.id ? newEntry : e));
    } else {
      setEntriesList([newEntry, ...entriesList]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setEntriesList(entriesList.filter((e) => e.id !== id));
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 text-white shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Account Entry</h1>
            <p className="text-sm text-muted-foreground">Manage all account transactions and entries</p>
          </div>
        </div>
        <Button onClick={openAddDialog} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-blue-500/50 via-indigo-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Entries</p>
              <p className="text-2xl font-bold">{entriesList.length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">PKR {entriesList.reduce((s, e) => s + e.amount, 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Account Heads</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{new Set(entriesList.map(e => e.head)).size}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Account Head</Label>
              <Select value={filterHead} onValueChange={setFilterHead}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="All">All</SelectItem>
                  {accountHeads.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account SubHead</Label>
              <Select value={filterSubHead} onValueChange={setFilterSubHead}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="All">All</SelectItem>
                  {Object.values(accountSubHeads).flat().map((sh) => (
                    <SelectItem key={sh} value={sh}>{sh}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Users</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="All">All</SelectItem>
                  {usersList.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover open={filterFromDateOpen} onOpenChange={setFilterFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !filterFromDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterFromDate ? format(filterFromDate, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={filterFromDate} onSelect={(d) => { setFilterFromDate(d); setFilterFromDateOpen(false); }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover open={filterToDateOpen} onOpenChange={setFilterToDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !filterToDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterToDate ? format(filterToDate, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={filterToDate} onSelect={(d) => { setFilterToDate(d); setFilterToDateOpen(false); }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Filter By</Label>
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {filterByOptions.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={pageSize} onValueChange={(v) => { setPageSize(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by head, subhead or comments..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-8"
              />
            </div>
          </div>

          <div className="overflow-x-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead className="w-[100px]">Head</TableHead>
                  <TableHead className="w-[120px]">SubHead</TableHead>
                  <TableHead className="w-[160px]">Comments</TableHead>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[80px]">Add By</TableHead>
                  <TableHead className="w-[80px]">Edit By</TableHead>
                  <TableHead className="w-[100px]">Amount</TableHead>
                  <TableHead className="w-[60px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No account entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground truncate">{item.id}</TableCell>
                      <TableCell className="font-medium truncate">{item.head}</TableCell>
                      <TableCell className="truncate">{item.subHead}</TableCell>
                      <TableCell className="truncate">{item.comments}</TableCell>
                      <TableCell className="truncate">{item.date}</TableCell>
                      <TableCell className="truncate">{item.addBy}</TableCell>
                      <TableCell className="truncate">{item.editBy}</TableCell>
                      <TableCell className="font-mono truncate">Rs. {item.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(item)}>
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * parseInt(pageSize)) + 1} to {Math.min(currentPage * parseInt(pageSize), filteredData.length)} of {filteredData.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>Previous</Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(page)} className="w-8 h-8 p-0">{page}</Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 text-white shadow-sm">
                <BookOpen className="h-4 w-4" />
              </div>
              <span>{editingItem ? 'Edit Account Entry' : 'Add Account Entry'}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Head</Label>
                <Select value={formHead} onValueChange={(v) => { setFormHead(v); setFormSubHead(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select head" />
                  </SelectTrigger>
                  <SelectContent portal={false}>
                    {accountHeads.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Account SubHead</Label>
                <Select value={formSubHead} onValueChange={setFormSubHead} disabled={!formHead}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subhead" />
                  </SelectTrigger>
                  <SelectContent portal={false}>
                    {subHeadOptions.map((sh) => (
                      <SelectItem key={sh} value={sh}>{sh}</SelectItem>
                    ))}
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
              <Textarea
                placeholder="Enter description..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select value={formTxnType} onValueChange={setFormTxnType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent portal={false}>
                    {transactionTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!formHead || !formSubHead || !formAmount} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                {editingItem ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
