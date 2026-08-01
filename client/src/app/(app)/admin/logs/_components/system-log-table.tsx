'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, RefreshCw, Search, Filter, CheckCircle, AlertTriangle, User, Activity, ScrollText, Printer, RotateCcw } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import { SystemLogsPrintDialog } from './system-log-print-dialog';

interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  description: string;
  userAgent: string;
  status: 'success' | 'error' | 'warning';
  page: string;
  details?: {
    entityId?: string;
    path?: string;
  } | null;
}

interface SystemLogsTableProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  defaultAction?: string;
  includePages?: string[];
  showRestore?: boolean;
}

const PAGE_SIZES = [10, 20, 50];

export function SystemLogsTable({ title, subtitle, icon: Icon, gradient, defaultAction = 'all', includePages, showRestore = false }: SystemLogsTableProps) {
  const { companyId, companies } = useCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [printOpen, setPrintOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  });
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>(defaultAction);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const company = useMemo(() => companies.find((c) => c.id === companyId), [companies, companyId]);

  const fetchLogs = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const response = await api.get('/admin/logs', {
        params: {
          companyId,
          fromDate: format(dateRange.from, 'yyyy-MM-dd'),
          toDate: format(dateRange.to, 'yyyy-MM-dd'),
          userId: selectedUser !== 'all' ? selectedUser : undefined,
          action: selectedAction !== 'all' ? selectedAction : undefined,
          module: selectedModule !== 'all' ? selectedModule : undefined,
          search: searchTerm || undefined,
          limit: 500,
          offset: 0,
        },
      });

      const data = response.data?.data;
      setLogs(Array.isArray(data?.data) ? data.data : []);
      setUsers(data?.users || []);
      setActions(data?.actions || []);
      setModules(data?.modules || []);
    } catch (error: any) {
      console.error('Failed to fetch logs:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to fetch logs',
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, dateRange, selectedUser, selectedAction, selectedModule, searchTerm, toast]);

  useEffect(() => {
    setCurrentPage(1);
    fetchLogs();
  }, [fetchLogs]);

  const visibleLogs = useMemo(() => {
    let list = logs;
    if (includePages && includePages.length > 0) {
      list = list.filter((log) => includePages.includes(log.page));
    }
    return list;
  }, [logs, includePages]);

  const kpis = useMemo(() => {
    let success = 0, error = 0, warning = 0;
    visibleLogs.forEach((log) => {
      if (log.status === 'success') success++;
      else if (log.status === 'error') error++;
      else if (log.status === 'warning') warning++;
    });
    return { total: visibleLogs.length, success, error, warning };
  }, [visibleLogs]);

  const totalPages = Math.max(1, Math.ceil(visibleLogs.length / pageSize));
  const paginatedLogs = visibleLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-emerald-100 text-emerald-700 flex items-center gap-1 border-emerald-200"><CheckCircle className="h-3 w-3" /> Success</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1 border-red-200"><AlertTriangle className="h-3 w-3" /> Error</Badge>;
      case 'warning':
        return <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1 border-amber-200"><AlertTriangle className="h-3 w-3" /> Warning</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const kpiCards = [
    { label: 'Total Records', value: kpis.total, icon: ScrollText, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Success', value: kpis.success, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Errors', value: kpis.error, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-100' },
    { label: 'Warnings', value: kpis.warning, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  const resetFilters = () => {
    setDateRange({ from: new Date(new Date().setDate(new Date().getDate() - 7)), to: new Date() });
    setSelectedUser('all');
    setSelectedAction(defaultAction);
    setSelectedModule('all');
    setSearchTerm('');
  };

  const handleRestore = async (log: LogEntry) => {
    setRestoringId(log.id);
    try {
      const response = await api.post(`/admin/logs/${log.id}/restore`, {}, { params: { companyId } });
      toast({ title: 'Success', description: response.data?.message || 'Record restored successfully' });
      fetchLogs();
    } catch (error: any) {
      console.error('Failed to restore record:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to restore record',
      });
    } finally {
      setRestoringId(null);
    }
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
          <Button variant="outline" onClick={() => setPrintOpen(true)} className="bg-white" disabled={visibleLogs.length === 0}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
        <div className="h-0.5 mt-4 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((metric) => (
          <div key={metric.label} className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
              <div className={`rounded-lg ${metric.bg} p-2.5 transition-all duration-300 group-hover:scale-110`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{metric.value}</p>
            </div>
          </div>
        ))}
      </div>

      <Card className="hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Customize the {title.toLowerCase()} view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateRange.from} onSelect={(date) => date && setDateRange((prev) => ({ ...prev, from: date }))} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.to, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateRange.to} onSelect={(date) => date && setDateRange((prev) => ({ ...prev, to: date }))} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map((action) => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Module</Label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module} value={module}>{module}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search user, action, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={fetchLogs} disabled={loading} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Apply Filters'}
              </Button>
              <Button variant="outline" onClick={resetFilters}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Showing {visibleLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, visibleLogs.length)} of {visibleLogs.length} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  {showRestore && <TableHead className="text-center">Restore</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={showRestore ? 8 : 7} className="text-center py-8 text-muted-foreground">Loading logs...</TableCell>
                  </TableRow>
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showRestore ? 8 : 7} className="text-center py-8 text-muted-foreground">No {title.toLowerCase()} found for the selected criteria.</TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.timestamp), 'dd MMM yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{log.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span>{log.module}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.page || '-'}</TableCell>
                      <TableCell className="max-w-[260px]">
                        <span className="line-clamp-2 text-sm">{log.description || '—'}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      {showRestore && (
                        <TableCell className="text-center">
                          {log.details?.entityId ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                              onClick={() => handleRestore(log)}
                              disabled={restoringId === log.id}
                            >
                              <RotateCcw className={`mr-1.5 h-3.5 w-3.5 ${restoringId === log.id ? 'animate-spin' : ''}`} />
                              {restoringId === log.id ? 'Restoring...' : 'Restore'}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
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
              <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(parseInt(value)); setCurrentPage(1); }}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent portal={false}>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SystemLogsPrintDialog
        title={title}
        open={printOpen}
        onOpenChange={setPrintOpen}
        company={company}
        logs={visibleLogs}
        fromDate={dateRange.from}
        toDate={dateRange.to}
      />
    </div>
  );
}
