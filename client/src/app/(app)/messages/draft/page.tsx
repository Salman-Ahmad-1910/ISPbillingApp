'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FileEdit, Trash2, CalendarIcon, Search, Send, Bell, AlertTriangle, ChevronLeft, ChevronRight, FileText, Clock, Loader2, PlusCircle } from 'lucide-react';
import type { Message } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function DraftMessagesPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sublocality, setSublocality] = useState('All');
  const [messageType, setMessageType] = useState('All');
  const [selectedUser, setSelectedUser] = useState('all');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newDraftName, setNewDraftName] = useState('');
  const [newDraftMobile, setNewDraftMobile] = useState('');
  const [newDraftMessage, setNewDraftMessage] = useState('');

  const { data: messages = [], isLoading } = useGenericQuery<Message[]>('messages', companyId ?? undefined);

  const filteredData = useMemo(() => {
    const drafts = messages.filter(m => m.status === 'draft');
    if (!search) return drafts;
    const q = search.toLowerCase();
    return drafts.filter(item =>
      item.name?.toLowerCase().includes(q) ||
      item.entityId?.toLowerCase().includes(q) ||
      item.mobileNo?.toLowerCase().includes(q)
    );
  }, [messages, search]);

  const totalPages = Math.ceil(filteredData.length / parseInt(pageSize));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * parseInt(pageSize),
    currentPage * parseInt(pageSize)
  );

  const totalPendingMessages = useMemo(() => filteredData.length, [filteredData]);

  const handleClearDrafts = async () => {
    if (!confirm('Are you sure you want to clear all draft messages?')) return;
    try {
      const drafts = messages.filter(m => m.status === 'draft');
      for (const d of drafts) {
        await api.delete(`/messages/${d.id}?companyId=${companyId}`);
      }
      queryClient.invalidateQueries({ queryKey: ['messages', companyId] });
      toast({ title: 'Success', description: 'All draft messages cleared.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to clear drafts.' });
    }
  };

  const handleCreateDraft = async () => {
    try {
      await api.post(`/messages?companyId=${companyId}`, {
        name: newDraftName,
        mobileNo: newDraftMobile,
        messageText: newDraftMessage,
        status: 'draft',
        companyId,
      });
      queryClient.invalidateQueries({ queryKey: ['messages', companyId] });
      setIsFormOpen(false);
      setNewDraftName('');
      setNewDraftMobile('');
      setNewDraftMessage('');
      toast({ title: 'Success', description: 'Draft created successfully.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create draft.' });
    }
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      await api.delete(`/messages/${id}?companyId=${companyId}`);
      queryClient.invalidateQueries({ queryKey: ['messages', companyId] });
      toast({ title: 'Success', description: 'Draft deleted.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete draft.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading draft messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
          <FileEdit className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Draft Messages</h1>
          <p className="text-sm text-muted-foreground">View and manage saved message drafts</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-orange-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <FileEdit className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Drafts</p>
              <p className="text-2xl font-bold">{messages.filter(m => m.status === 'draft').length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pending Messages</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalPendingMessages}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
              <p className="text-lg font-bold text-violet-600 dark:text-violet-400">Today</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Sublocality</Label>
              <Select value={sublocality} onValueChange={setSublocality}>
                <SelectTrigger className="border-muted-foreground/20">
                  <SelectValue placeholder="Select sublocality" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {['All', 'Gulshan', 'Saddar', 'Clifton', 'Defence', 'Korangi', 'Landhi', 'Malir'].map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message Type</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger className="border-muted-foreground/20">
                  <SelectValue placeholder="Select message type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {['All', 'Promotional', 'Transactional', 'Alert', 'Reminder', 'Notification'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="border-muted-foreground/20">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {[{ id: 'all', name: 'All Users' }, { id: '1', name: 'Ahmed Khan' }, { id: '2', name: 'Fatima Ali' }].map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal border-muted-foreground/20', !date && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setDateOpen(false); }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
                  <PlusCircle className="h-4 w-4" />
                  New Draft
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Draft Message</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Recipient Name</Label>
                    <Input value={newDraftName} onChange={e => setNewDraftName(e.target.value)} placeholder="e.g., Ahmed Khan" className="border-muted-foreground/20" />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile Number</Label>
                    <Input value={newDraftMobile} onChange={e => setNewDraftMobile(e.target.value)} placeholder="e.g., 0300-1234567" className="border-muted-foreground/20" />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <textarea value={newDraftMessage} onChange={e => setNewDraftMessage(e.target.value)} placeholder="Type your message..." className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-muted-foreground/20" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/30 transition-all duration-300">Cancel</Button>
                    <Button onClick={handleCreateDraft} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md">Save Draft</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="secondary" className="gap-2 transition-all duration-300 hover:scale-105">
              <Bell className="h-4 w-4" />
              Send Notification Messages
            </Button>
            <Button variant="destructive" className="gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105" onClick={handleClearDrafts}>
              <AlertTriangle className="h-4 w-4" />
              Clear Draft Messages
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={pageSize} onValueChange={(v) => { setPageSize(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-16 border-muted-foreground/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {['5', '10', '25', '50', '100'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, ID or mobile..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-8 border-muted-foreground/20" />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile No</TableHead>
                  <TableHead>Send By</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="rounded-full bg-amber-100 p-3 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 transition-all duration-300 hover:scale-110 hover:shadow-lg">
                          <FileEdit className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No draft messages found</p>
                        <p className="text-xs text-muted-foreground/60">Create a new draft to get started.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={item.id} className="transition-all duration-300 hover:bg-muted/50 hover:shadow-sm">
                      <TableCell className="font-medium">{item.entityId || item.id.slice(0, 8)}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.mobileNo}</TableCell>
                      <TableCell>{item.sentBy || '-'}</TableCell>
                      <TableCell>{item.sendedAt || item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 transition-all duration-300 hover:scale-110" onClick={() => handleDeleteDraft(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredData.length > parseInt(pageSize) && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * parseInt(pageSize)) + 1} to {Math.min(currentPage * parseInt(pageSize), filteredData.length)} of {filteredData.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="transition-all duration-300 hover:scale-105">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(page)} className="w-8 h-8 p-0 transition-all duration-300 hover:scale-110">{page}</Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="transition-all duration-300 hover:scale-105">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
