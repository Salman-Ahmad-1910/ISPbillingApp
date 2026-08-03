'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, ChevronLeft, ChevronRight, Eye, Loader2, RefreshCw, MessageCircle, Trash2 } from 'lucide-react';
import type { Connection, Area, Message } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const messageTitles = [
  'Select the Message',
  'User Cradentials',
  'Defaulter',
  'Internet Card',
  'Promotion',
  'New User',
  'Internet Recharge',
];

const EXPIRY_TITLE = 'Defaulter';

function waNumber(phone?: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '92' + digits.slice(1);
  return digits;
}

function messageBody(m: Message): string {
  return m.messageText || `Dear ${m.name}, your monthly subscription fee is due. Please pay your dues to continue uninterrupted services. Thank you.`;
}

export default function ExpiryMessagesPage() {
  const { companyId, companies } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useGenericQuery<Message>('messages', companyId ?? undefined);
  const { data: connections = [] } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);
  const { data: areas = [] } = useGenericQuery<Area>('network/areas', companyId ?? undefined);

  const [draftTitle, setDraftTitle] = useState('Select the Message');
  const [draftSublocality, setDraftSublocality] = useState('all');
  const [draftStatus, setDraftStatus] = useState('all');
  const [draftType, setDraftType] = useState('all');
  const [draftBox, setDraftBox] = useState('all');
  const [draftPackage, setDraftPackage] = useState('all');
  const [draftCompany, setDraftCompany] = useState('all');

  const [title, setTitle] = useState('Select the Message');
  const [sublocality, setSublocality] = useState('all');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [box, setBox] = useState('all');
  const [pkg, setPkg] = useState('all');
  const [company, setCompany] = useState('all');

  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [preview, setPreview] = useState<Message | null>(null);

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

  const statuses = useMemo(() => {
    const set = new Set<string>();
    connections.forEach((c) => { if (c.status) set.add(c.status); });
    return Array.from(set);
  }, [connections]);

  const types = useMemo(() => {
    const set = new Set<string>();
    connections.forEach((c) => { if (c.connectionType) set.add(c.connectionType); });
    return Array.from(set);
  }, [connections]);

  const boxes = useMemo(() => {
    const set = new Set<string>();
    connections.forEach((c) => { if (c.boxNumber) set.add(c.boxNumber); });
    return Array.from(set);
  }, [connections]);

  const packages = useMemo(() => {
    const set = new Set<string>();
    connections.forEach((c) => {
      if (c.packageInternet) set.add(c.packageInternet);
      if (c.packageCable) set.add(c.packageCable);
    });
    return Array.from(set);
  }, [connections]);

  const expiryMessages = useMemo(() => {
    return messages.filter((m) => {
      if (m.status !== 'sent') return false;
      return m.messageType === EXPIRY_TITLE || (m.messageText?.startsWith(`${EXPIRY_TITLE}:`) ?? false);
    });
  }, [messages]);

  const filteredData = useMemo(() => {
    return expiryMessages.filter((m) => {
      if (title !== 'Select the Message') {
        const matchType = m.messageType === title;
        const matchText = m.messageText?.startsWith(`${title}:`) ?? false;
        if (!matchType && !matchText) return false;
      }
      const conn = m.entityId ? connectionMap.get(m.entityId) : undefined;
      if (sublocality !== 'all' && areaName(conn) !== sublocality) return false;
      if (status !== 'all' && (conn?.status || '') !== status) return false;
      if (type !== 'all' && (conn?.connectionType || '') !== type) return false;
      if (box !== 'all' && (conn?.boxNumber || '') !== box) return false;
      if (pkg !== 'all' && conn?.packageInternet !== pkg && conn?.packageCable !== pkg) return false;
      if (company !== 'all' && (conn?.companyId || m.companyId) !== company) return false;
      return true;
    });
  }, [expiryMessages, connectionMap, areas, title, sublocality, status, type, box, pkg, company]);

  const applyFilters = () => {
    setTitle(draftTitle);
    setSublocality(draftSublocality);
    setStatus(draftStatus);
    setType(draftType);
    setBox(draftBox);
    setPkg(draftPackage);
    setCompany(draftCompany);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setDraftTitle('Select the Message');
    setDraftSublocality('all');
    setDraftStatus('all');
    setDraftType('all');
    setDraftBox('all');
    setDraftPackage('all');
    setDraftCompany('all');
    setTitle('Select the Message');
    setSublocality('all');
    setStatus('all');
    setType('all');
    setBox('all');
    setPkg('all');
    setCompany('all');
    setCurrentPage(1);
  };

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

  const waPhone = (m: Message): string => {
    const conn = m.entityId ? connectionMap.get(m.entityId) : undefined;
    return m.mobileNo || m.phone || conn?.cell || conn?.mobile || '';
  };

  const handleWhatsApp = (m: Message) => {
    const num = waNumber(waPhone(m));
    if (!num) return;
    const text = encodeURIComponent(messageBody(m));
    window.open(`https://wa.me/${num}?text=${text}`, '_blank');
  };

  const handleDelete = async (m: Message) => {
    if (!confirm(`Delete the expiry message sent to "${m.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/messages/${m.id}?companyId=${companyId}`);
      queryClient.invalidateQueries({ queryKey: ['messages', companyId] });
      toast({ title: 'Success', description: 'Message deleted.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to delete message.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading expiry messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-rose-500 to-red-600 p-2.5 text-white shadow-sm">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expiry Messages</h1>
          <p className="text-sm text-muted-foreground">View fee reminder messages sent to subscribers</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-rose-500/50 via-red-500/30 to-transparent" />

      {/* Filters */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>*]:min-w-0">
            <div className="space-y-2">
              <Label>Message Title</Label>
              <Select value={draftTitle} onValueChange={setDraftTitle}>
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
              <Select value={draftSublocality} onValueChange={setDraftSublocality}>
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
              <Label>Status</Label>
              <Select value={draftStatus} onValueChange={setDraftStatus}>
                <SelectTrigger className="w-full max-w-[220px] border-muted-foreground/20">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={draftType} onValueChange={setDraftType}>
                <SelectTrigger className="w-full max-w-[220px] border-muted-foreground/20">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Box Number</Label>
              <Select value={draftBox} onValueChange={setDraftBox}>
                <SelectTrigger className="w-full max-w-[220px] border-muted-foreground/20">
                  <SelectValue placeholder="Select box" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  {boxes.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Package</Label>
              <Select value={draftPackage} onValueChange={setDraftPackage}>
                <SelectTrigger className="w-full max-w-[220px] border-muted-foreground/20">
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  {packages.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={draftCompany} onValueChange={setDraftCompany}>
                <SelectTrigger className="w-full max-w-[220px] border-muted-foreground/20">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 mt-6">
            <Button variant="outline" onClick={resetFilters} className="gap-2 transition-all duration-300 hover:scale-105">
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
            <Button onClick={applyFilters} className="gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
              Show
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main table */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Expiry Reminders</h2>
              <p className="text-xs text-muted-foreground">
                {filteredData.length} message(s)
              </p>
            </div>
            {title !== 'Select the Message' && (
              <span className="text-sm text-muted-foreground">
                Message: <span className="font-medium text-foreground">{title}</span>
              </span>
            )}
          </div>

          <div className="min-w-0 overflow-x-auto rounded-md border [&_th]:px-2 [&_th]:py-2.5 [&_td]:px-2 [&_td]:py-2.5">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Subscriber ID</TableHead>
                  <TableHead>Internet ID</TableHead>
                  <TableHead>Subscriber Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>WhatsApp Number</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="rounded-full bg-rose-100 p-3 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 transition-all duration-300 hover:scale-110 hover:shadow-lg">
                          <Clock className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No expiry messages found</p>
                        <p className="text-xs text-muted-foreground/60">Adjust the filters and press Show.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, i) => {
                    const conn = item.entityId ? connectionMap.get(item.entityId) : undefined;
                    const phone = waPhone(item);
                    const address = item.address || conn?.address || '-';
                    return (
                      <TableRow key={item.id} className="transition-all duration-300 hover:bg-muted/50 hover:shadow-sm">
                        <TableCell className="font-mono text-xs text-muted-foreground">{(currentPage - 1) * parseInt(pageSize) + i + 1}</TableCell>
                        <TableCell className="min-w-0 font-mono text-xs truncate" title={item.entityId}>{item.entityId ? item.entityId.slice(0, 8) : '-'}</TableCell>
                        <TableCell className="min-w-0 font-medium truncate" title={item.internetId}>{item.internetId || '-'}</TableCell>
                        <TableCell className="min-w-0">
                          {item.entityId ? (
                            <Link
                              href={`/crm/subscriber-detail?connectionId=${item.entityId}`}
                              className="text-blue-600 hover:underline dark:text-blue-400 truncate"
                              title={item.name}
                            >
                              {item.name}
                            </Link>
                          ) : (
                            <span className="truncate" title={item.name}>{item.name}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate" title={address}>{address}</TableCell>
                        <TableCell className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate font-medium" title={phone}>{phone || '-'}</span>
                            {phone && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 transition-all duration-300 hover:scale-110" title="Send via WhatsApp" onClick={() => handleWhatsApp(item)}>
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30 transition-all duration-300 hover:scale-110" title="Preview" onClick={() => setPreview(item)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 transition-all duration-300 hover:scale-110" title="Delete" onClick={() => handleDelete(item)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
            <DialogTitle>Expiry Message Preview</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{preview.name}</span></div>
                <div><span className="text-muted-foreground">Internet ID:</span> <span className="font-medium">{preview.internetId || '-'}</span></div>
                <div><span className="text-muted-foreground">WhatsApp:</span> <span className="font-medium">{waPhone(preview) || '-'}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="font-medium capitalize">{preview.status || '-'}</span></div>
                <div><span className="text-muted-foreground">Message Type:</span> <span className="font-medium">{preview.messageType || '-'}</span></div>
                <div><span className="text-muted-foreground">Sent At:</span> <span className="font-medium">{preview.sendedAt || preview.createdAt || '-'}</span></div>
              </div>
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="text-muted-foreground text-xs mb-1">Message body</p>
                <p>{messageBody(preview)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
