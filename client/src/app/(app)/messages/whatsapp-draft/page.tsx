'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { MessageCircle, Trash2, Search, Send, AlertTriangle, ChevronLeft, ChevronRight, Eye, Loader2 } from 'lucide-react';
import type { Message, Connection, Area } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const messageTitles = [
  'All',
  'User Cradentials',
  'Defaulter',
  'Internet Card',
  'Promotion',
  'New User',
  'Internet Recharge',
];

const SEND_TO_OPTIONS = ['Subscriber', 'Dealer', 'Inquiry', 'Staff', 'Admin', 'Other'];

function toDateKey(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : format(d, 'yyyy-MM-dd');
}

function displayDate(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return isNaN(d.getTime()) ? key : format(d, 'dd MMM yyyy');
}

function waNumber(phone?: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '92' + digits.slice(1);
  return digits;
}

export default function WhatsAppDraftPage() {
  const { companyId } = useCompany();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useGenericQuery<Message>('messages', companyId ?? undefined);
  const { data: connections = [] } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);
  const { data: areas = [] } = useGenericQuery<Area>('network/areas', companyId ?? undefined);

  const [title, setTitle] = useState('All');
  const [sublocality, setSublocality] = useState('all');
  const [sendTo, setSendTo] = useState('All');
  const [dateFilter, setDateFilter] = useState('all');

  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Message | null>(null);
  const [isSending, setIsSending] = useState(false);

  const waDrafts = useMemo(() => messages.filter((m) => m.status === 'whatsapp_draft'), [messages]);

  const connectionMap = useMemo(() => {
    const map = new Map<string, Connection>();
    connections.forEach((c) => map.set(c.id, c));
    return map;
  }, [connections]);

  const areaName = (c?: Connection): string => {
    if (!c) return '';
    const area = areas.find((a) => a.id === c.sublocalityId);
    return area ? (area.subLocality || area.locality || '') : '';
  };

  const sublocalities = useMemo(() => {
    const set = new Set<string>();
    areas.forEach((a) => { if (a.subLocality) set.add(a.subLocality); });
    return Array.from(set);
  }, [areas]);

  const dateOptions = useMemo(() => {
    const set = new Set<string>();
    waDrafts.forEach((m) => {
      const k = toDateKey(m.createdAt);
      if (k) set.add(k);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [waDrafts]);

  const filteredData = useMemo(() => {
    return waDrafts.filter((m) => {
      if (title !== 'All' && m.messageType !== title) return false;
      if (sendTo !== 'All' && (m.sendTo || '') !== sendTo) return false;
      if (dateFilter !== 'all' && toDateKey(m.createdAt) !== dateFilter) return false;
      if (sublocality !== 'all') {
        const conn = m.entityId ? connectionMap.get(m.entityId) : undefined;
        if (areaName(conn) !== sublocality) return false;
      }
      if (search) {
        const q = search.trim().toLowerCase();
        if (/^[0-9]/.test(q)) {
          if (!String(m.entityId || '').toLowerCase().startsWith(q) &&
              !String(m.internetId || '').toLowerCase().startsWith(q) &&
              !String(m.mobileNo || '').toLowerCase().startsWith(q)) return false;
        } else if (!String(m.name || '').toLowerCase().startsWith(q)) {
          return false;
        }
      }
      return true;
    });
  }, [waDrafts, title, sendTo, dateFilter, sublocality, search, connectionMap, areas]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / parseInt(pageSize)));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * parseInt(pageSize),
    currentPage * parseInt(pageSize)
  );

  const pageNumbers = useMemo(() => {
    const total = totalPages;
    const current = currentPage;
    const set = new Set<number>();
    set.add(1);
    set.add(total);
    for (let p = current - 1; p <= current + 1; p++) {
      if (p >= 1 && p <= total) set.add(p);
    }
    const sorted = Array.from(set).sort((a, b) => a - b);
    const result: (number | '...')[] = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) result.push('...');
      result.push(p);
      prev = p;
    }
    return result;
  }, [totalPages, currentPage]);

  const allPaginatedSelected = paginatedData.length > 0 && paginatedData.every((m) => selected.has(m.id));

  const toggleAll = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      paginatedData.forEach((m) => (checked ? next.add(m.id) : next.delete(m.id)));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sendSelected = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!confirm(`Send ${ids.length} WhatsApp message(s)? WhatsApp will open for each recipient.`)) return;
    setIsSending(true);
    try {
      for (const id of ids) {
        const msg = messages.find((m) => m.id === id);
        if (!msg) continue;
        const phone = waNumber(msg.mobileNo || msg.phone);
        const text = encodeURIComponent(msg.messageText || '');
        if (phone) {
          window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
        }
        await api.put(`/messages/${id}?companyId=${companyId}`, {
          ...msg,
          status: 'sent',
          sentBy: user?.name || 'Admin',
          sendedAt: new Date().toISOString(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['messages', companyId] });
      setSelected(new Set());
      toast({ title: 'Success', description: `${ids.length} WhatsApp message(s) sent.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to send messages.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Delete this WhatsApp draft?')) return;
    try {
      await api.delete(`/messages/${id}?companyId=${companyId}`);
      queryClient.invalidateQueries({ queryKey: ['messages', companyId] });
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast({ title: 'Success', description: 'Draft deleted.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to delete draft.' });
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all WhatsApp drafts?')) return;
    try {
      for (const d of waDrafts) {
        await api.delete(`/messages/${d.id}?companyId=${companyId}`);
      }
      queryClient.invalidateQueries({ queryKey: ['messages', companyId] });
      setSelected(new Set());
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
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 p-2.5 text-white shadow-sm">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Draft Messages</h1>
          <p className="text-sm text-muted-foreground">Review and send WhatsApp messages written in New Messages</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-green-500/50 via-emerald-500/30 to-transparent" />

      {/* Filters */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
            <div className="space-y-2">
              <Label>Message Title</Label>
              <Select value={title} onValueChange={setTitle}>
                <SelectTrigger className="w-full max-w-[220px] border-muted-foreground/20">
                  <SelectValue placeholder="Select message title" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {messageTitles.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sublocality</Label>
              <Select value={sublocality} onValueChange={setSublocality}>
                <SelectTrigger className="w-full max-w-[220px] border-muted-foreground/20">
                  <SelectValue placeholder="Select sublocality" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  {sublocalities.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Send To</Label>
              <Select value={sendTo} onValueChange={setSendTo}>
                <SelectTrigger className="w-full max-w-[220px] border-muted-foreground/20">
                  <SelectValue placeholder="Select recipient type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="All">All</SelectItem>
                  {SEND_TO_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full max-w-[220px] border-muted-foreground/20">
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All dates</SelectItem>
                  {dateOptions.map((d) => (
                    <SelectItem key={d} value={d}>{displayDate(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 mt-6">
            <Button
              onClick={() => sendSelected(Array.from(selected))}
              disabled={selected.size === 0 || isSending}
              className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send ({selected.size})
            </Button>
            <Button variant="destructive" className="gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105" onClick={handleClearAll}>
              <AlertTriangle className="h-4 w-4" />
              Clear All Drafts
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main table */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">WhatsApp Drafts</h2>
              <p className="text-xs text-muted-foreground">
                {filteredData.length} message(s)
                {selected.size > 0 && <> | <span className="font-medium text-emerald-600 dark:text-emerald-400">{selected.size} selected</span></>}
              </p>
            </div>
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, ID or mobile..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-8 border-muted-foreground/20" />
            </div>
          </div>

          <div className="min-w-0 overflow-x-auto rounded-md border [&_th]:px-2 [&_th]:py-2.5 [&_td]:px-2 [&_td]:py-2.5">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox checked={allPaginatedSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                  </TableHead>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Send By</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead className="w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-950/30 dark:text-green-400 transition-all duration-300 hover:scale-110 hover:shadow-lg">
                          <MessageCircle className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No WhatsApp drafts found</p>
                        <p className="text-xs text-muted-foreground/60">Write a WhatsApp message in New Messages or adjust the filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, i) => (
                    <TableRow key={item.id} className="transition-all duration-300 hover:bg-muted/50 hover:shadow-sm">
                      <TableCell>
                        <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleOne(item.id)} aria-label={`Select ${item.name}`} />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{(currentPage - 1) * parseInt(pageSize) + i + 1}</TableCell>
                      <TableCell className="min-w-0">
                        <span className="truncate font-medium" title={item.name}>{item.name}</span>
                        {item.messageType && <p className="truncate text-xs text-muted-foreground" title={item.messageType}>{item.messageType}</p>}
                      </TableCell>
                      <TableCell className="min-w-0 text-xs text-muted-foreground truncate" title={item.messageText}>{item.messageText || '-'}</TableCell>
                      <TableCell className="min-w-0 font-medium truncate" title={item.mobileNo || item.phone}>{item.mobileNo || item.phone || '-'}</TableCell>
                      <TableCell className="min-w-0 truncate text-xs text-muted-foreground" title={item.sentBy}>{item.sentBy || '-'}</TableCell>
                      <TableCell className="min-w-0 truncate text-xs text-muted-foreground" title={item.createdAt}>{item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy, hh:mm a') : '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30 transition-all duration-300 hover:scale-110" title="Preview" onClick={() => setPreview(item)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 transition-all duration-300 hover:scale-110" title="Delete" onClick={() => handleDeleteDraft(item.id)}>
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

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
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

            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="text-sm text-muted-foreground mr-2">
                Showing {filteredData.length === 0 ? 0 : ((currentPage - 1) * parseInt(pageSize)) + 1} to {Math.min(currentPage * parseInt(pageSize), filteredData.length)} of {filteredData.length} entries
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="transition-all duration-300 hover:scale-105">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              {pageNumbers.map((page, idx) =>
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-sm text-muted-foreground">...</span>
                ) : (
                  <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(page)} className="w-8 h-8 p-0 transition-all duration-300 hover:scale-110">{page}</Button>
                )
              )}
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="transition-all duration-300 hover:scale-105">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WhatsApp Message Preview</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{preview.name}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{preview.mobileNo || preview.phone || '-'}</span></div>
                <div><span className="text-muted-foreground">Message Type:</span> <span className="font-medium">{preview.messageType || '-'}</span></div>
                <div><span className="text-muted-foreground">Send To:</span> <span className="font-medium">{preview.sendTo || '-'}</span></div>
                <div><span className="text-muted-foreground">Send By:</span> <span className="font-medium">{preview.sentBy || '-'}</span></div>
                <div><span className="text-muted-foreground">Created:</span> <span className="font-medium">{preview.createdAt ? format(new Date(preview.createdAt), 'dd MMM yyyy, hh:mm a') : '-'}</span></div>
              </div>
              <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 text-sm">
                <p className="text-green-700 dark:text-green-300 text-xs mb-1">WhatsApp Message</p>
                <p className="text-green-800 dark:text-green-200">{preview.messageText || 'No message content'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
