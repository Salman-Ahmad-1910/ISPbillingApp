'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, addDays, isToday, startOfToday } from 'date-fns';
import { Send, CalendarDays, Search, ChevronLeft, ChevronRight, CheckCircle2, Users, Loader2 } from 'lucide-react';
import type { Message, Connection, Area } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

const messageTitles = [
  'All',
  'User Cradentials',
  'Defaulter',
  'Internet Card',
  'Promotion',
  'New User',
  'Internet Recharge',
];

const SEND_TO_OPTIONS = ['Subscriber', 'Dealer', 'Staff', 'Admin'];

function toDateKey(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : format(d, 'yyyy-MM-dd');
}

export default function SentMessagesPage() {
  const { companyId } = useCompany();
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfToday());
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sublocality, setSublocality] = useState('all');
  const [messageTitle, setMessageTitle] = useState('All');
  const [sendTo, setSendTo] = useState('All');

  const { data: messages = [], isLoading } = useGenericQuery<Message>('messages', companyId ?? undefined);
  const { data: connections = [] } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);
  const { data: areas = [] } = useGenericQuery<Area>('network/areas', companyId ?? undefined);

  const sentMessages = useMemo(() => messages.filter((m) => m.status === 'sent'), [messages]);

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

  const dayMessages = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return sentMessages.filter((m) => toDateKey(m.sendedAt || m.createdAt) === key);
  }, [sentMessages, selectedDate]);

  const filteredData = useMemo(() => {
    return dayMessages.filter((item) => {
      if (messageTitle !== 'All' && item.messageType !== messageTitle) return false;
      if (sendTo !== 'All' && (item.sendTo || '') !== sendTo) return false;
      if (sublocality !== 'all') {
        const conn = item.entityId ? connectionMap.get(item.entityId) : undefined;
        if (areaName(conn) !== sublocality) return false;
      }
      if (search) {
        const q = search.trim().toLowerCase();
        if (/^[0-9]/.test(q)) {
          if (!String(item.entityId || '').toLowerCase().startsWith(q) &&
              !String(item.internetId || '').toLowerCase().startsWith(q) &&
              !String(item.mobileNo || '').toLowerCase().startsWith(q)) return false;
        } else if (!String(item.name || '').toLowerCase().startsWith(q) &&
                   !String(item.messageType || '').toLowerCase().startsWith(q)) {
          return false;
        }
      }
      return true;
    });
  }, [dayMessages, messageTitle, sendTo, sublocality, search, connectionMap, areas]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / parseInt(pageSize)));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * parseInt(pageSize),
    currentPage * parseInt(pageSize)
  );

  const uniqueRecipients = useMemo(() => new Set(dayMessages.map(m => m.name)).size, [dayMessages]);

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

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading sent messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm">
          <Send className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sent Messages</h1>
          <p className="text-sm text-muted-foreground">View sent messages day by day</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-blue-500/50 via-cyan-500/30 to-transparent" />

      {/* Date navigator */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-4 py-2 sm:flex-row sm:gap-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => { setSelectedDate(d => addDays(d, -1)); setCurrentPage(1); }}
              className="h-12 w-12 border-muted-foreground/20 transition-all duration-300 hover:scale-110 hover:shadow-md"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-xl font-bold tracking-tight sm:text-2xl">
                  {format(selectedDate, 'EEEE, dd MMM yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Send className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold text-foreground">{dayMessages.length}</span> sent
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-foreground">{dayMessages.length}</span> delivered
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  <span className="font-semibold text-foreground">{uniqueRecipients}</span> recipients
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => { setSelectedDate(d => addDays(d, 1)); setCurrentPage(1); }}
              disabled={isToday(selectedDate)}
              className="h-12 w-12 border-muted-foreground/20 transition-all duration-300 hover:scale-110 hover:shadow-md disabled:opacity-40"
              aria-label="Next day"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setSelectedDate(startOfToday()); setCurrentPage(1); }}
              className="transition-all duration-300 hover:scale-105"
            >
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
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
              <Label>Message Title</Label>
              <Select value={messageTitle} onValueChange={setMessageTitle}>
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
          </div>
        </CardContent>
      </Card>

      {/* Daily messages table */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Messages Sent on {format(selectedDate, 'dd MMM yyyy')}</h2>
              <p className="text-xs text-muted-foreground">
                {filteredData.length} message(s)
              </p>
            </div>
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, ID or message..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-8 border-muted-foreground/20" />
            </div>
          </div>

          <div className="min-w-0 overflow-x-auto rounded-md border [&_th]:px-2 [&_th]:py-2.5 [&_td]:px-2 [&_td]:py-2.5">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Internet ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Sent To</TableHead>
                  <TableHead>Send By</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 transition-all duration-300 hover:scale-110 hover:shadow-lg">
                          <Send className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No sent messages on this date</p>
                        <p className="text-xs text-muted-foreground/60">Use the arrows to browse other dates.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, i) => (
                    <TableRow key={item.id} className="transition-all duration-300 hover:bg-muted/50 hover:shadow-sm">
                      <TableCell className="font-mono text-xs text-muted-foreground">{(currentPage - 1) * parseInt(pageSize) + i + 1}</TableCell>
                      <TableCell className="min-w-0 font-medium truncate" title={item.internetId}>{item.internetId || '-'}</TableCell>
                      <TableCell className="min-w-0 truncate" title={item.name}>{item.name}</TableCell>
                      <TableCell className="min-w-0 text-xs text-muted-foreground truncate" title={item.messageText || item.messageType}>{item.messageText || item.messageType || '-'}</TableCell>
                      <TableCell className="min-w-0 truncate" title={item.mobileNo || item.phone}>{item.mobileNo || item.phone || '-'}</TableCell>
                      <TableCell className="min-w-0 truncate text-xs text-muted-foreground" title={item.sentBy}>{item.sentBy || '-'}</TableCell>
                      <TableCell className="min-w-0 truncate text-xs text-muted-foreground" title={(item.sendedAt || item.createdAt)}>
                        {(item.sendedAt || item.createdAt) ? format(new Date(item.sendedAt || item.createdAt), 'hh:mm a') : '-'}
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
    </div>
  );
}
