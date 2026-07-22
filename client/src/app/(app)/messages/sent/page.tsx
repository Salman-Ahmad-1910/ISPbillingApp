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
import { Send, CalendarIcon, Search, ChevronLeft, ChevronRight, CheckCircle2, Clock, Users, Loader2 } from 'lucide-react';
import type { Message } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

export default function SentMessagesPage() {
  const { companyId } = useCompany();
  const [sublocality, setSublocality] = useState('All');
  const [messageTitle, setMessageTitle] = useState('All');
  const [selectedUser, setSelectedUser] = useState('all');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: messages = [], isLoading } = useGenericQuery<Message[]>('messages', companyId ?? undefined);

  const filteredData = useMemo(() => {
    const sent = messages.filter(m => m.status === 'sent');
    if (!search) return sent;
    const q = search.toLowerCase();
    return sent.filter(item =>
      item.name?.toLowerCase().includes(q) ||
      item.entityId?.toLowerCase().includes(q) ||
      item.internetId?.toLowerCase().includes(q) ||
      item.messageType?.toLowerCase().includes(q)
    );
  }, [messages, search]);

  const totalPages = Math.ceil(filteredData.length / parseInt(pageSize));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * parseInt(pageSize),
    currentPage * parseInt(pageSize)
  );

  const uniqueRecipients = useMemo(() => new Set(filteredData.map(m => m.name)).size, [filteredData]);

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
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm">
          <Send className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sent Messages</h1>
          <p className="text-sm text-muted-foreground">View the status of all sent messages</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-blue-500/50 via-cyan-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Sent</p>
              <p className="text-2xl font-bold">{messages.filter(m => m.status === 'sent').length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Delivered</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{messages.filter(m => m.status === 'sent').length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Recipients</p>
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{uniqueRecipients}</p>
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
              <Label>Message Title</Label>
              <Select value={messageTitle} onValueChange={setMessageTitle}>
                <SelectTrigger className="border-muted-foreground/20">
                  <SelectValue placeholder="Select message title" />
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
              <Input placeholder="Search by name, ID or message..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-8 border-muted-foreground/20" />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
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
                        <p className="text-sm font-medium text-muted-foreground">No sent messages found</p>
                        <p className="text-xs text-muted-foreground/60">Messages will appear here once sent.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={item.id} className="transition-all duration-300 hover:bg-muted/50 hover:shadow-sm">
                      <TableCell className="font-medium">{item.entityId}</TableCell>
                      <TableCell>{item.internetId}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.messageType}</TableCell>
                      <TableCell>{item.mobileNo}</TableCell>
                      <TableCell>{item.sentBy}</TableCell>
                      <TableCell>{item.sendedAt}</TableCell>
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
