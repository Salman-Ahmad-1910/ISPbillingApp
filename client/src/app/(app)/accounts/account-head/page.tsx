'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Layers, PlusCircle, MoreHorizontal, Edit3, Trash2, Search, Loader2 } from 'lucide-react';

const accountTypes = [
  'Assets Account',
  'Expense Account',
  'Revenue/Income Account',
  'Liabilities Account',
  'Equity Account',
];

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

export default function AccountHeadPage() {
  const { companyId } = useCompany();
  const { data: apiHeads = [], isLoading } = useGenericQuery<any>('accounts/heads', companyId ?? undefined);
  const { data: apiSubHeads = [] } = useGenericQuery<any>('accounts/sub-heads', companyId ?? undefined);

  const [headsList, setHeadsList] = useState<AccountHead[]>([]);
  const [subHeadsList, setSubHeadsList] = useState<SubHead[]>([]);

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

  // Head dialog state
  const [headDialogOpen, setHeadDialogOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<AccountHead | null>(null);
  const [formMasterAccount, setFormMasterAccount] = useState('');
  const [formAccountType, setFormAccountType] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Sub Head dialog state
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editingSubHead, setEditingSubHead] = useState<SubHead | null>(null);
  const [formSubMasterAccount, setFormSubMasterAccount] = useState('');
  const [formSelectedHeadId, setFormSelectedHeadId] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formSubDescription, setFormSubDescription] = useState('');

  // Head pagination
  const [headPageSize, setHeadPageSize] = useState('10');
  const [headCurrentPage, setHeadCurrentPage] = useState(1);
  const [headSearch, setHeadSearch] = useState('');

  // Sub Head pagination
  const [subPageSize, setSubPageSize] = useState('10');
  const [subCurrentPage, setSubCurrentPage] = useState(1);
  const [subSearch, setSubSearch] = useState('');

  // Head filtering
  const filteredHeads = useMemo(() => {
    return headsList.filter((h) => {
      if (headSearch) {
        const q = headSearch.toLowerCase();
        if (
          !h.masterAccount.toLowerCase().includes(q) &&
          !h.accountType.toLowerCase().includes(q) &&
          !h.description.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [headsList, headSearch]);

  const headTotalPages = Math.ceil(filteredHeads.length / parseInt(headPageSize));
  const paginatedHeads = filteredHeads.slice(
    (headCurrentPage - 1) * parseInt(headPageSize),
    headCurrentPage * parseInt(headPageSize)
  );

  // Sub Head filtering
  const filteredSubHeads = useMemo(() => {
    return subHeadsList.filter((s) => {
      if (subSearch) {
        const q = subSearch.toLowerCase();
        if (
          !s.subMasterAccount.toLowerCase().includes(q) &&
          !s.masterAccount.toLowerCase().includes(q) &&
          !s.accountType.toLowerCase().includes(q) &&
          !s.description.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [subHeadsList, subSearch]);

  const subTotalPages = Math.ceil(filteredSubHeads.length / parseInt(subPageSize));
  const paginatedSubHeads = filteredSubHeads.slice(
    (subCurrentPage - 1) * parseInt(subPageSize),
    subCurrentPage * parseInt(subPageSize)
  );

  // Head CRUD
  const openAddHeadDialog = () => {
    setEditingHead(null);
    setFormMasterAccount('');
    setFormAccountType('');
    setFormDescription('');
    setHeadDialogOpen(true);
  };

  const openEditHeadDialog = (item: AccountHead) => {
    setEditingHead(item);
    setFormMasterAccount(item.masterAccount);
    setFormAccountType(item.accountType);
    setFormDescription(item.description);
    setHeadDialogOpen(true);
  };

  const handleSaveHead = () => {
    if (!formMasterAccount || !formAccountType) return;
    const newItem: AccountHead = {
      id: editingHead ? editingHead.id : String(Date.now()),
      masterAccount: formMasterAccount,
      accountType: formAccountType,
      description: formDescription,
    };
    if (editingHead) {
      setHeadsList(headsList.map((h) => (h.id === editingHead.id ? newItem : h)));
    } else {
      setHeadsList([newItem, ...headsList]);
    }
    setHeadDialogOpen(false);
  };

  const handleDeleteHead = (id: string) => {
    setHeadsList(headsList.filter((h) => h.id !== id));
  };

  // Sub Head CRUD
  const selectedHead = headsList.find((h) => h.id === formSelectedHeadId);

  const openAddSubDialog = () => {
    setEditingSubHead(null);
    setFormSubMasterAccount('');
    setFormSelectedHeadId('');
    setFormBudget('');
    setFormSubDescription('');
    setSubDialogOpen(true);
  };

  const openEditSubDialog = (item: SubHead) => {
    setEditingSubHead(item);
    setFormSubMasterAccount(item.subMasterAccount);
    setFormSelectedHeadId(item.masterAccountId);
    setFormBudget(item.budget);
    setFormSubDescription(item.description);
    setSubDialogOpen(true);
  };

  const handleSaveSubHead = () => {
    if (!formSubMasterAccount || !formSelectedHeadId) return;
    const head = headsList.find((h) => h.id === formSelectedHeadId);
    const newItem: SubHead = {
      id: editingSubHead ? editingSubHead.id : String(Date.now()),
      subMasterAccount: formSubMasterAccount,
      masterAccountId: formSelectedHeadId,
      masterAccount: head?.masterAccount || '',
      accountType: head?.accountType || '',
      budget: formBudget,
      description: formSubDescription,
    };
    if (editingSubHead) {
      setSubHeadsList(subHeadsList.map((s) => (s.id === editingSubHead.id ? newItem : s)));
    } else {
      setSubHeadsList([newItem, ...subHeadsList]);
    }
    setSubDialogOpen(false);
  };

  const handleDeleteSubHead = (id: string) => {
    setSubHeadsList(subHeadsList.filter((s) => s.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading account heads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5 text-white shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Account Head</h1>
            <p className="text-sm text-muted-foreground">Manage account heads and sub heads</p>
          </div>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-purple-500/50 via-indigo-500/30 to-transparent" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Heads</p>
              <p className="text-2xl font-bold">{headsList.length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Sub Heads</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{subHeadsList.length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Account Types</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{new Set(headsList.map(h => h.accountType)).size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== ACCOUNT HEADS TABLE ========== */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Account Heads</h2>
            <Button onClick={openAddHeadDialog} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Head
            </Button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={headPageSize} onValueChange={(v) => { setHeadPageSize(v); setHeadCurrentPage(1); }}>
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
                placeholder="Search heads..."
                value={headSearch}
                onChange={(e) => { setHeadSearch(e.target.value); setHeadCurrentPage(1); }}
                className="pl-8"
              />
            </div>
          </div>

          <div className="overflow-x-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead className="w-[200px]">Master Account</TableHead>
                  <TableHead className="w-[200px]">Account Type</TableHead>
                  <TableHead className="w-[300px]">Description</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedHeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No account heads found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedHeads.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground truncate">{item.id}</TableCell>
                      <TableCell className="font-medium truncate">{item.masterAccount}</TableCell>
                      <TableCell className="truncate">{item.accountType}</TableCell>
                      <TableCell className="truncate">{item.description}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditHeadDialog(item)}>
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteHead(item.id)}>
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

          {filteredHeads.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((headCurrentPage - 1) * parseInt(headPageSize)) + 1} to {Math.min(headCurrentPage * parseInt(headPageSize), filteredHeads.length)} of {filteredHeads.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setHeadCurrentPage(prev => Math.max(1, prev - 1))} disabled={headCurrentPage === 1}>Previous</Button>
                {Array.from({ length: headTotalPages }, (_, i) => i + 1).map((page) => (
                  <Button key={page} variant={headCurrentPage === page ? 'default' : 'outline'} size="sm" onClick={() => setHeadCurrentPage(page)} className="w-8 h-8 p-0">{page}</Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setHeadCurrentPage(prev => Math.min(headTotalPages, prev + 1))} disabled={headCurrentPage === headTotalPages}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== SUB HEADS TABLE ========== */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Account Sub Heads</h2>
            <Button onClick={openAddSubDialog} className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-sm hover:from-blue-600 hover:to-cyan-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Sub Head
            </Button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={subPageSize} onValueChange={(v) => { setSubPageSize(v); setSubCurrentPage(1); }}>
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
                placeholder="Search sub heads..."
                value={subSearch}
                onChange={(e) => { setSubSearch(e.target.value); setSubCurrentPage(1); }}
                className="pl-8"
              />
            </div>
          </div>

          <div className="overflow-x-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead className="w-[160px]">Sub Master Account</TableHead>
                  <TableHead className="w-[160px]">Master Account</TableHead>
                  <TableHead className="w-[100px]">Budget</TableHead>
                  <TableHead className="w-[160px]">Account Type</TableHead>
                  <TableHead className="w-[200px]">Description</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSubHeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sub heads found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSubHeads.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground truncate">{item.id}</TableCell>
                      <TableCell className="font-medium truncate">{item.subMasterAccount}</TableCell>
                      <TableCell className="truncate">{item.masterAccount}</TableCell>
                      <TableCell className="font-mono truncate">{item.budget ? `Rs. ${Number(item.budget).toLocaleString()}` : '-'}</TableCell>
                      <TableCell className="truncate">{item.accountType}</TableCell>
                      <TableCell className="truncate">{item.description}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditSubDialog(item)}>
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteSubHead(item.id)}>
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

          {filteredSubHeads.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((subCurrentPage - 1) * parseInt(subPageSize)) + 1} to {Math.min(subCurrentPage * parseInt(subPageSize), filteredSubHeads.length)} of {filteredSubHeads.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSubCurrentPage(prev => Math.max(1, prev - 1))} disabled={subCurrentPage === 1}>Previous</Button>
                {Array.from({ length: subTotalPages }, (_, i) => i + 1).map((page) => (
                  <Button key={page} variant={subCurrentPage === page ? 'default' : 'outline'} size="sm" onClick={() => setSubCurrentPage(page)} className="w-8 h-8 p-0">{page}</Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setSubCurrentPage(prev => Math.min(subTotalPages, prev + 1))} disabled={subCurrentPage === subTotalPages}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== ADD/EDIT HEAD DIALOG ========== */}
      <Dialog open={headDialogOpen} onOpenChange={setHeadDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 p-1.5 text-white shadow-sm">
                <Layers className="h-4 w-4" />
              </div>
              <span>{editingHead ? 'Edit Account Head' : 'Add Account Head'}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Master Account</Label>
              <Input
                placeholder="Enter master account name"
                value={formMasterAccount}
                onChange={(e) => setFormMasterAccount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select value={formAccountType} onValueChange={setFormAccountType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {accountTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Enter description..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setHeadDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveHead} disabled={!formMasterAccount || !formAccountType} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                {editingHead ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== ADD/EDIT SUB HEAD DIALOG ========== */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-1.5 text-white shadow-sm">
                <Layers className="h-4 w-4" />
              </div>
              <span>{editingSubHead ? 'Edit Account Sub Head' : 'Add Account Sub Head'}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sub Master Account</Label>
              <Input
                placeholder="Enter sub master account name"
                value={formSubMasterAccount}
                onChange={(e) => setFormSubMasterAccount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Master Account</Label>
              <Select value={formSelectedHeadId} onValueChange={setFormSelectedHeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select master account" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {headsList.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.masterAccount}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedHead && (
              <div className="rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Account Type: </span>
                <span className="font-medium">{selectedHead.accountType}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Budget</Label>
              <Input
                type="number"
                placeholder="Enter budget amount"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Enter description..."
                value={formSubDescription}
                onChange={(e) => setFormSubDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSubDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSubHead} disabled={!formSubMasterAccount || !formSelectedHeadId} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                {editingSubHead ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
