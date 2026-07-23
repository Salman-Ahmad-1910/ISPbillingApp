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
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { BookOpen, PlusCircle, MoreHorizontal, Edit3, Trash2, Search, CalendarIcon, DollarSign, FileText, Loader2 } from 'lucide-react';
import type { Staff } from '@/lib/types';

const filterByOptions = ['All', 'Add By', 'Edit By'];

interface AccountHead {
  id: string;
  masterAccount: string;
  accountType: string;
  description: string;
}

interface SubHead {
  id: string;
  subMasterAccount: string;
  masterAccountId: string;
  masterAccount: string;
  accountType: string;
  budget: string;
  description: string;
}

interface TransactionType {
  id: string;
  paymentChannel: string;
  transaction: string;
  title: string;
  openingBalance: number;
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

export default function AccountEntryPage() {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: apiEntries = [], isLoading } = useGenericQuery<any>('accounts/entries', companyId ?? undefined);
  const { data: staff = [] } = useGenericQuery<Staff>('hr/staff', companyId ?? undefined);
  const { data: apiHeads = [] } = useGenericQuery<any>('accounts/heads', companyId ?? undefined);
  const { data: apiSubHeads = [] } = useGenericQuery<any>('accounts/sub-heads', companyId ?? undefined);
  const { data: apiTxnTypes = [] } = useGenericQuery<any>('billing/transaction-types', companyId ?? undefined);

  const [entriesList, setEntriesList] = useState<AccountEntry[]>([]);
  const [headsList, setHeadsList] = useState<AccountHead[]>([]);
  const [subHeadsList, setSubHeadsList] = useState<SubHead[]>([]);
  const [txnTypesList, setTxnTypesList] = useState<TransactionType[]>([]);

  const usersList = useMemo(() => {
    if (!Array.isArray(staff)) return [];
    return staff.map((s: any) => s.name).filter(Boolean);
  }, [staff]);

  useEffect(() => {
    if (Array.isArray(apiEntries) && apiEntries.length > 0) {
      setEntriesList(apiEntries);
    }
  }, [apiEntries]);

  useEffect(() => {
    if (Array.isArray(apiHeads) && apiHeads.length > 0) {
      setHeadsList(apiHeads);
    }
  }, [apiHeads]);

  useEffect(() => {
    if (Array.isArray(apiSubHeads) && apiSubHeads.length > 0) {
      setSubHeadsList(apiSubHeads);
    }
  }, [apiSubHeads]);

  useEffect(() => {
    if (Array.isArray(apiTxnTypes) && apiTxnTypes.length > 0) {
      setTxnTypesList(apiTxnTypes);
    }
  }, [apiTxnTypes]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountEntry | null>(null);

  const [formHeadId, setFormHeadId] = useState('');
  const [formSubHeadId, setFormSubHeadId] = useState('');
  const [formDate, setFormDate] = useState<Date | undefined>(undefined);
  const [formDateOpen, setFormDateOpen] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formTxnTypeId, setFormTxnTypeId] = useState('');

  // Filter state
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

  // Derived sub head options based on selected head
  const subHeadOptions = useMemo(() => {
    if (!formHeadId) return [];
    return subHeadsList.filter((s) => s.masterAccountId === formHeadId);
  }, [formHeadId, subHeadsList]);

  // Get display names for entries
  const getHeadName = (headId: string) => {
    const head = headsList.find((h) => h.id === headId);
    return head?.masterAccount || headId;
  };

  const getSubHeadName = (subHeadId: string) => {
    const sub = subHeadsList.find((s) => s.id === subHeadId);
    return sub?.subMasterAccount || subHeadId;
  };

  const getTxnTypeName = (txnTypeId: string) => {
    const txn = txnTypesList.find((t) => t.id === txnTypeId);
    return txn?.paymentChannel || txnTypeId;
  };

  // Filtering
  const filteredData = useMemo(() => {
    return entriesList.filter((e) => {
      if (filterHead !== 'All' && e.head !== filterHead) return false;
      if (filterSubHead !== 'All' && e.subHead !== filterSubHead) return false;
      if (filterUser !== 'All' && e.addBy !== filterUser && e.editBy !== filterUser) return false;
      if (filterBy === 'Add By' && filterUser !== 'All' && e.addBy !== filterUser) return false;
      if (filterBy === 'Edit By' && filterUser !== 'All' && e.editBy !== filterUser) return false;
      if (filterFromDate) {
        const from = format(filterFromDate, 'yyyy-MM-dd');
        if (e.date < from) return false;
      }
      if (filterToDate) {
        const to = format(filterToDate, 'yyyy-MM-dd');
        if (e.date > to) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const headName = getHeadName(e.head).toLowerCase();
        const subHeadName = getSubHeadName(e.subHead).toLowerCase();
        if (!headName.includes(q) && !subHeadName.includes(q) && !e.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [entriesList, filterHead, filterSubHead, filterUser, filterBy, filterFromDate, filterToDate, search, headsList, subHeadsList]);

  const totalPages = Math.ceil(filteredData.length / parseInt(pageSize));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * parseInt(pageSize),
    currentPage * parseInt(pageSize)
  );

  // Dialog handlers
  const openAddDialog = () => {
    setEditingItem(null);
    setFormHeadId('');
    setFormSubHeadId('');
    setFormDate(undefined);
    setFormDescription('');
    setFormAmount('');
    setFormTxnTypeId('');
    setDialogOpen(true);
  };

  const openEditDialog = (item: AccountEntry) => {
    setEditingItem(item);
    setFormHeadId(item.head);
    setFormSubHeadId(item.subHead);
    setFormDate(new Date(item.date));
    setFormDescription(item.description);
    setFormAmount(String(item.amount));
    setFormTxnTypeId(item.transactionType);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formHeadId || !formSubHeadId || !formAmount) return;
    const payload = {
      head: formHeadId,
      subHead: formSubHeadId,
      description: formDescription,
      date: formDate ? format(formDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
      addBy: editingItem ? editingItem.addBy : 'Admin',
      editBy: editingItem ? 'Admin' : '-',
      amount: parseFloat(formAmount),
      transactionType: formTxnTypeId,
      companyId: companyId,
    };
    try {
      if (editingItem) {
        await api.put(`/accounts/entries/${editingItem.id}`, payload);
      } else {
        await api.post('/accounts/entries', payload);
      }
      queryClient.invalidateQueries({ queryKey: ['accounts/entries', companyId] });
      toast({ title: 'Success', description: editingItem ? 'Entry updated.' : 'Entry added.' });
      setDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to save' });
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
          Add Entry
        </Button>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-blue-500/50 via-indigo-500/30 to-transparent" />

      {/* Summary Cards */}
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
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Transaction Types</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{new Set(entriesList.map(e => e.transactionType)).size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
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
                  {headsList.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.masterAccount}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sub Head</Label>
              <Select value={filterSubHead} onValueChange={setFilterSubHead}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="All">All</SelectItem>
                  {subHeadsList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.subMasterAccount}</SelectItem>
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

      {/* Table */}
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
                placeholder="Search by head, sub head or description..."
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
                  <TableHead className="w-[120px]">Head</TableHead>
                  <TableHead className="w-[120px]">Sub Head</TableHead>
                  <TableHead className="w-[200px]">Description</TableHead>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[80px]">Add By</TableHead>
                  <TableHead className="w-[80px]">Edit By</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No account entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground truncate">{item.id}</TableCell>
                      <TableCell className="font-medium truncate">{getHeadName(item.head)}</TableCell>
                      <TableCell className="truncate">{getSubHeadName(item.subHead)}</TableCell>
                      <TableCell className="truncate">{item.description}</TableCell>
                      <TableCell className="truncate">{item.date}</TableCell>
                      <TableCell className="truncate">{item.addBy}</TableCell>
                      <TableCell className="truncate">{item.editBy}</TableCell>
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

      {/* Add/Edit Dialog */}
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
                <Select value={formHeadId} onValueChange={(v) => {
                  setFormHeadId(v);
                  const matching = subHeadsList.filter((s) => s.masterAccountId === v);
                  setFormSubHeadId(matching.length > 0 ? matching[0].id : '');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select head" />
                  </SelectTrigger>
                  <SelectContent portal={false}>
                    {headsList.map((h) => (
                      <SelectItem key={h.id} value={h.id}>{h.masterAccount}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sub Account Head</Label>
                <Select value={formSubHeadId} onValueChange={setFormSubHeadId} disabled={!formHeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub head" />
                  </SelectTrigger>
                  <SelectContent portal={false}>
                    {subHeadOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.subMasterAccount}</SelectItem>
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
                rows={5}
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
                <Select value={formTxnTypeId} onValueChange={setFormTxnTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent portal={false}>
                    {txnTypesList.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.paymentChannel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!formHeadId || !formSubHeadId || !formAmount} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                {editingItem ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
