'use client';

import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarIcon,
  RefreshCw,
  Users,
  History,
  Loader2,
  Search,
  Eye,
  Printer,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { ConnectionLogDetailDialog } from './connection-log-detail-dialog';
import { ConnectionLogPrintDialog } from './connection-log-print-dialog';
import type { ConnectionLog, User } from '@/lib/types';

interface UpdateConnectionTableProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
}

const PAGE_SIZES = [10, 20, 50];

const TYPE_LABELS: Record<string, string> = {
  both: 'Both',
  internet: 'Internet',
  tv_cable: 'TV Cable',
};

type SortKey = 'logDate' | 'internetId' | 'subscriberName' | 'actionType' | 'updatedByName';

function actionStyles(action: string): string {
  if (/new|install|activ|resum/i.test(action)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (/suspend|disconnect|deactivat|delet/i.test(action)) return 'bg-red-100 text-red-700 border-red-200';
  if (/price|charge|discount|amount/i.test(action)) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (/area|splitter|box|port|subscriber id|name|address|contact/i.test(action)) return 'bg-sky-100 text-sky-700 border-sky-200';
  return 'bg-violet-100 text-violet-700 border-violet-200';
}

export function UpdateConnectionTable({ title, subtitle, icon: Icon, gradient }: UpdateConnectionTableProps) {
  const { companyId } = useCompany();

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [actionType, setActionType] = useState('all');
  const [updatedBy, setUpdatedBy] = useState('all');
  const [connectionType, setConnectionType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey | null>('logDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedLog, setSelectedLog] = useState<ConnectionLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const {
    data: logsData = [],
    isLoading,
    isFetching,
    refetch,
  } = useGenericQuery<ConnectionLog>('admin/connections/logs', companyId ?? undefined);
  const { data: users = [] } = useGenericQuery<User>('admin/users', companyId ?? undefined);

  const logs = logsData as ConnectionLog[];

  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.actionType) set.add(l.actionType);
    });
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (q && !`${l.subscriberName || ''} ${l.internetId || ''}`.toLowerCase().includes(q)) return false;
      if (fromDate && (l.logDate || '') < format(fromDate, 'yyyy-MM-dd')) return false;
      if (toDate && (l.logDate || '') > format(toDate, 'yyyy-MM-dd')) return false;
      if (actionType !== 'all' && l.actionType !== actionType) return false;
      if (updatedBy !== 'all' && l.updatedBy !== updatedBy) return false;
      if (connectionType !== 'all' && l.connectionType !== connectionType) return false;
      return true;
    });
  }, [logs, search, fromDate, toDate, actionType, updatedBy, connectionType]);

  const sortedLogs = useMemo(() => {
    const arr = [...filteredLogs];
    if (!sortKey) return arr;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'logDate':
          cmp = `${a.logDate || ''} ${a.logTime || ''}`.localeCompare(`${b.logDate || ''} ${b.logTime || ''}`);
          break;
        case 'internetId':
          cmp = (a.internetId || '').localeCompare(b.internetId || '');
          break;
        case 'subscriberName':
          cmp = (a.subscriberName || '').localeCompare(b.subscriberName || '');
          break;
        case 'actionType':
          cmp = (a.actionType || '').localeCompare(b.actionType || '');
          break;
        case 'updatedByName':
          cmp = (a.updatedByName || '').localeCompare(b.updatedByName || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filteredLogs, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / pageSize));
  const paginatedLogs = sortedLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = logs.filter((l) => l.logDate === todayStr).length;
  const uniqueSubscribers = new Set(logs.map((l) => l.connectionId)).size;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'logDate' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setFromDate(undefined);
    setToDate(undefined);
    setActionType('all');
    setUpdatedBy('all');
    setConnectionType('all');
    setSortKey('logDate');
    setSortDir('desc');
    setCurrentPage(1);
  };

  const SortIndicator = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const openDetail = (log: ConnectionLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="h-0.5 mt-4 bg-gradient-to-r from-amber-500 via-orange-500 to-transparent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Changes</p>
            <div className="rounded-lg bg-blue-100 p-2.5 transition-all duration-300 group-hover:scale-110">
              <History className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold">{filteredLogs.length}</p>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Changes Today</p>
            <div className="rounded-lg bg-emerald-100 p-2.5 transition-all duration-300 group-hover:scale-110">
              <RefreshCw className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{todayLogs}</p>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Subscribers Updated</p>
            <div className="rounded-lg bg-amber-100 p-2.5 transition-all duration-300 group-hover:scale-110">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold">{uniqueSubscribers}</p>
        </div>
      </div>

      <Card className="hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
          <CardDescription>Search subscribers and filter connection changes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium leading-none">Search Subscriber</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by subscriber name or ID..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Action Type</label>
              <Select
                value={actionType}
                onValueChange={(value) => {
                  setActionType(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Staff / Updated By</label>
              <Select
                value={updatedBy}
                onValueChange={(value) => {
                  setUpdatedBy(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Staff</SelectItem>
                  {(users as User[]).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, 'PPP') : 'Select start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, 'PPP') : 'Select end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Connection Type</label>
              <Select
                value={connectionType}
                onValueChange={(value) => {
                  setConnectionType(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="internet">Internet</SelectItem>
                  <SelectItem value="tv_cable">TV Cable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
                Refresh
              </Button>
              <Button variant="outline" onClick={resetFilters} className="w-full sm:w-auto">
                Reset
              </Button>
              <Button
                variant="default"
                onClick={() => setPrintOpen(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm hover:from-amber-600 hover:to-orange-700 w-full sm:w-auto"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle>{title} List</CardTitle>
          <CardDescription>
            Showing {sortedLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedLogs.length)} of {sortedLogs.length} changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Log ID</TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('logDate')}>
                      Date <SortIndicator column="logDate" />
                    </button>
                  </TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('internetId')}>
                      Subscriber <SortIndicator column="internetId" />
                    </button>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('actionType')}>
                      Action <SortIndicator column="actionType" />
                    </button>
                  </TableHead>
                  <TableHead>Previous Value</TableHead>
                  <TableHead>New Value</TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('updatedByName')}>
                      Updated By <SortIndicator column="updatedByName" />
                    </button>
                  </TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading connection logs...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No connection changes found for the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {log.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-medium">{log.logDate || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{log.logTime || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm font-semibold">{log.subscriberName || '—'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{log.internetId || ''}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <Badge variant="secondary">{TYPE_LABELS[log.connectionType || ''] || log.connectionType || '—'}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge className={cn('border', actionStyles(log.actionType || ''))}>
                          {log.actionType || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px]">
                        <div className="truncate text-muted-foreground" title={log.oldValue}>
                          {log.oldValue || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px]">
                        <div className="truncate font-medium" title={log.newValue}>
                          {log.newValue || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div className="font-medium">{log.updatedByName || '—'}</div>
                        <div className="text-xs text-muted-foreground">{log.userRole || ''}</div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px]">
                        <div className="truncate text-muted-foreground" title={log.remarks}>
                          {log.remarks || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openDetail(log)}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(parseInt(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConnectionLogDetailDialog log={selectedLog} open={detailOpen} onOpenChange={setDetailOpen} />
      <ConnectionLogPrintDialog open={printOpen} onOpenChange={setPrintOpen} logs={sortedLogs} fromDate={fromDate} toDate={toDate} />
    </div>
  );
}
