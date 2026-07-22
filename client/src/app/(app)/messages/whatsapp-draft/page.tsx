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
import { MessageCircle, CalendarIcon, Search, ChevronLeft, ChevronRight, Trash2, Send, PlusCircle, Eye, Loader2 } from 'lucide-react';
import type { Message } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function WhatsAppDraftPage() {
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
  const [previewMsg, setPreviewMsg] = useState<Message | null>(null);
  const [newDraftName, setNewDraftName] = useState('');
  const [newDraftMobile, setNewDraftMobile] = useState('');
  const [newDraftMessage, setNewDraftMessage] = useState('');

  const { data: messages = [], isLoading } = useGenericQuery<Message[]>('messages', companyId ?? undefined);

  const filteredData = useMemo(() => {
    const drafts = messages.filter(m => m.status === 'whatsapp_draft');
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

  const handleCreateDraft = async () => {
    try {
      await api.post(`/messages?companyId=${companyId}`, {
        name: newDraftName,
        mobileNo: newDraftMobile,
        messageText: newDraftMessage,
        status: 'whatsapp_draft',
        messageType: 'WhatsApp',
        companyId,
      });
      queryClient.invalidateQueries({ queryKey: ['messages', companyId] });
      setIsFormOpen(false);
      setNewDraftName('');
      setNewDraftMobile('');
      setNewDraftMessage('');
      toast({ title: 'Success', description: 'WhatsApp draft created.' });
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

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all WhatsApp drafts?')) return;
    try {
      for (const d of filteredData) {
        await api.delete(`/messages/${d.id}?companyId=${companyId}`);
      }
      queryClient.invalidateQueries({ queryKey: ['messages', companyId] });
      toast({ title: 'Success', description: 'All WhatsApp drafts cleared.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to clear drafts.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading WhatsApp drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 p-2.5 text-white shadow-sm">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Draft Messages</h1>
          <p className="text-sm text-muted-foreground">Manage WhatsApp message drafts before sending</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-green-500/50 via-emerald-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Drafts</p>
              <p className="text-2xl font-bold">{filteredData.length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ready to Send</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredData.length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Eye className="h-5 w-5" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {['All', 'User Cradentials', 'Defaulter', 'Internet Card', 'Promotion', 'New User', 'Internet Recharge'].map((t) => (
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
                <Button className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
                  <PlusCircle className="h-4 w-4" />
                  New WhatsApp Draft
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New WhatsApp Draft</DialogTitle>
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
                    <textarea value={newDraftMessage} onChange={e => setNewDraftMessage(e.target.value)} placeholder="Type your WhatsApp message..." className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-muted-foreground/20" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateDraft} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700">Save Draft</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="destructive" className="gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105" onClick={handleClearAll}>
              <Trash2 className="h-4 w-4" />
              Clear All Drafts
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
                  <TableHead>Message</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-950/30 dark:text-green-400 transition-all duration-300 hover:scale-110 hover:shadow-lg">
                          <MessageCircle className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No WhatsApp drafts found</p>
                        <p className="text-xs text-muted-foreground/60">Create a new draft to get started.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={item.id} className="transition-all duration-300 hover:bg-muted/50 hover:shadow-sm">
                      <TableCell className="font-medium">{item.entityId || item.id.slice(0, 8)}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.mobileNo || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.messageText || '-'}</TableCell>
                      <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30 transition-all duration-300 hover:scale-110" onClick={() => setPreviewMsg(item)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 transition-all duration-300 hover:scale-110" onClick={() => handleDeleteDraft(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      <Dialog open={!!previewMsg} onOpenChange={() => setPreviewMsg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WhatsApp Message Preview</DialogTitle>
          </DialogHeader>
          {previewMsg && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{previewMsg.name}</span></div>
                <div><span className="text-muted-foreground">Mobile:</span> <span className="font-medium">{previewMsg.mobileNo || '-'}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{previewMsg.messageType || 'WhatsApp'}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{previewMsg.createdAt ? new Date(previewMsg.createdAt).toLocaleString() : '-'}</span></div>
              </div>
              <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 text-sm">
                <p className="text-green-700 dark:text-green-300 text-xs mb-1">WhatsApp Message</p>
                <p className="text-green-800 dark:text-green-200">{previewMsg.messageText || 'No message content'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
