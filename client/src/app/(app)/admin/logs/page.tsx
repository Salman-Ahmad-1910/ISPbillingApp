'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, Search, Filter, RefreshCw, User, Activity, AlertTriangle, CheckCircle, ScrollText, Printer, RotateCcw, X, Hash, ShieldCheck } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import type { Company } from '@/lib/types';

interface LogDetails {
  entityId?: string;
  path?: string;
  connectionType?: string;
  subscriberName?: string;
  internetId?: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  actionType?: string;
  requestBody?: string;
  [key: string]: any;
}

interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  description: string;
  serialNumbers: string;
  userAgent: string;
  status: 'success' | 'error' | 'warning';
  page: string;
  details?: LogDetails | null;
}

interface LogSummary {
  totalLogs: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  topUsers: { name: string; count: number }[];
  topModules: { module: string; count: number }[];
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  manager: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  dealer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  sub_dealer: 'bg-teal-100 text-teal-700 border-teal-200',
  staff: 'bg-amber-100 text-amber-700 border-amber-200',
  'recovery officer': 'bg-purple-100 text-purple-700 border-purple-200',
  recovery_officer: 'bg-purple-100 text-purple-700 border-purple-200',
};

const CONNECTION_TYPES = [
  { value: 'both', label: 'Both' },
  { value: 'internet', label: 'Internet' },
  { value: 'tv_cable', label: 'TV Cable' },
];

const PAGE_SIZES = [10, 20, 50, 100];

export default function LogsPage() {
  const { companyId, companies } = useCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [logsData, setLogsData] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [printOpen, setPrintOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  });
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedConnectionType, setSelectedConnectionType] = useState<string>('all');
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [pageInput, setPageInput] = useState<string>('');

  const company = useMemo(() => companies.find((c) => c.id === companyId), [companies, companyId]);
  const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize));

  const getVisiblePages = () => {
    const startPage = Math.max(1, currentPage - 3);
    const endPage = Math.min(totalPages, currentPage + 3);
    const visible = [];
    for (let i = startPage; i <= endPage; i++) visible.push(i);
    return visible;
  };

  const fetchLogs = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = {
        companyId,
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        userId: selectedUser !== 'all' ? selectedUser : undefined,
        actorType: selectedRole !== 'all' ? selectedRole : undefined,
        action: selectedAction !== 'all' ? selectedAction : undefined,
        module: selectedModule !== 'all' ? selectedModule : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        connectionType: selectedConnectionType !== 'all' ? selectedConnectionType : undefined,
        page: selectedPage !== 'all' ? selectedPage : undefined,
        search: searchTerm || undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      };

      const response = await api.get('/admin/logs', { params });

      const responseData = response.data?.data || {};
      const logsArray = Array.isArray(responseData.data) ? responseData.data : [];

      setLogsData(logsArray);
      setSummary(responseData.summary || null);
      setTotalLogs(responseData.summary?.totalLogs || logsArray.length);
      setUsers(responseData.users || []);
      setRoles(responseData.roles || []);
      setActions(responseData.actions || []);
      setModules(responseData.modules || []);
      setPages(Array.from(new Set((logsArray as LogEntry[]).map((log) => log.page).filter(Boolean))));
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
  }, [companyId, dateRange, selectedUser, selectedRole, selectedAction, selectedModule, selectedStatus, selectedConnectionType, selectedPage, searchTerm, currentPage, pageSize, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const resetFilters = () => {
    setDateRange({ from: new Date(new Date().setDate(new Date().getDate() - 7)), to: new Date() });
    setSelectedUser('all');
    setSelectedRole('all');
    setSelectedAction('all');
    setSelectedModule('all');
    setSelectedStatus('all');
    setSelectedConnectionType('all');
    setSelectedPage('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const exportLogs = () => {
    if (logsData.length === 0) return;
    const header = ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Page', 'Serial Numbers', 'Description', 'Status'];
    const escape = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    const rows = logsData.map((log) => [
      format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      log.userName || '',
      log.userRole || '-',
      log.action,
      log.module,
      log.page || '-',
      log.serialNumbers || '',
      log.description || '',
      log.status,
    ].map(escape).join(','));

    const csv = '\uFEFF' + [header.join(','), ...rows].join('\n');
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `system-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast({ title: 'Success', description: 'Logs exported successfully' });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Success</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Warning</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const summaryKpiData = summary ? [
    { label: 'Total Logs', value: summary.totalLogs?.toLocaleString() || '0', icon: ScrollText, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Success', value: summary.successCount?.toLocaleString() || '0', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Errors', value: summary.errorCount?.toLocaleString() || '0', icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-100' },
    { label: 'Warnings', value: summary.warningCount?.toLocaleString() || '0', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
  ] : [];

  const canRestore = (log: LogEntry) => log.action === 'delete' && log.details?.entityId;

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">System Logs</h1>
              <p className="text-sm text-muted-foreground">Every write, update and delete across the system with operator, serial and entity details.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPrintOpen(true)} disabled={logsData.length === 0}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={exportLogs} disabled={logsData.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="h-0.5 mt-4 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryKpiData.map((metric) => (
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
      )}

      <Card className="hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Customize your log view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dateRange.from && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, 'PPP') : 'Pick a date'}
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
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dateRange.to && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, 'PPP') : 'Pick a date'}
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
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>User Type</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue placeholder="Select user type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                <SelectContent>
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
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module} value={module}>{module}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Connection Type</Label>
              <Select value={selectedConnectionType} onValueChange={setSelectedConnectionType}>
                <SelectTrigger><SelectValue placeholder="Select connection type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {CONNECTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Page</Label>
              <Select value={selectedPage} onValueChange={setSelectedPage}>
                <SelectTrigger><SelectValue placeholder="Select page" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pages</SelectItem>
                  {pages.map((page) => (
                    <SelectItem key={page} value={page}>{page}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="User, action, serial number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={fetchLogs} disabled={loading} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Applying...' : 'Apply Filters'}
              </Button>
              <Button variant="outline" onClick={resetFilters}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            Invoices, purchases, dealers, staff, subscribers, connections and every other write/update/delete operation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>User Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Serial Numbers</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Restore</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Loading logs...
                    </TableCell>
                  </TableRow>
                ) : logsData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      No logs found for the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  logsData.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.timestamp), 'dd MMM yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{log.userName || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('border flex items-center gap-1', ROLE_STYLES[log.userRole?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200')}>
                          <ShieldCheck className="h-3 w-3" />
                          {log.userRole || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{log.action}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span>{log.module}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.page || '-'}</TableCell>
                      <TableCell>
                        {log.serialNumbers ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {log.serialNumbers.split(',').map((sn, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] font-mono">
                                <Hash className="h-2.5 w-2.5 mr-1" />
                                {sn.trim()}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <span className="line-clamp-2 text-sm">{log.description || '—'}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-center">
                        {canRestore(log) ? (
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all duration-300">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Showing {totalLogs === 0 ? 0 : ((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalLogs)} of {totalLogs} logs
            </div>
            <div className="flex items-center gap-2">
              <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(parseInt(value)); setCurrentPage(1); }}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {getVisiblePages().map((page) => (
                  <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(page)} className="w-8 h-8 p-0">
                    {page}
                  </Button>
                ))}
                {currentPage + 3 < totalPages && (
                  <>
                    <span className="px-2 text-muted-foreground">...</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} className="w-8 h-8 p-0">
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  placeholder="Go to"
                  value={pageInput}
                  onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setPageInput(v); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { const page = parseInt(pageInput); if (page && page >= 1 && page <= totalPages) { setCurrentPage(page); setPageInput(''); } } }}
                  className="w-16 h-8 text-center"
                  min={1}
                  max={totalPages}
                />
                <Button variant="outline" size="sm" onClick={() => { const page = parseInt(pageInput); if (page && page >= 1 && page <= totalPages) { setCurrentPage(page); setPageInput(''); } }} disabled={!pageInput} className="h-8 px-2">
                  Go
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <LogsPrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        company={company}
        logs={logsData}
        fromDate={dateRange.from}
        toDate={dateRange.to}
      />
    </div>
  );
}

function LogsPrintDialog({
  open,
  onOpenChange,
  company,
  logs,
  fromDate,
  toDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company;
  logs: LogEntry[];
  fromDate: Date;
  toDate: Date;
}) {
  useEffect(() => {
    if (!open) return;
    const printStyles = `
      @media print {
        body * { visibility: hidden; }
        .print-logs-container, .print-logs-container * { visibility: visible; }
        .print-logs-container { position: absolute !important; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
        body { margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { overflow: hidden !important; }
        @page { size: A4 landscape; margin: 12mm; }
        * { box-shadow: none !important; text-shadow: none !important; }
        table, th, td { border: 1px solid #d1d5db !important; }
      }
    `;
    const styleElement = document.createElement('style');
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);
    return () => {
      if (document.head.contains(styleElement)) document.head.removeChild(styleElement);
    };
  }, [open]);

  const logoUrl = company?.logo ? `${api?.defaults?.baseURL}/uploads/company_images/${company.id}` : null;
  const stampUrl = company?.stamp ? `${api?.defaults?.baseURL}/uploads/company_stamps/${company.id}` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0 gap-0">
        <div className="no-print sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">System Logs - Print Preview</h2>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Close
            </Button>
          </div>
        </div>

        <div className="print-logs-container bg-white text-gray-900 p-8 font-sans max-w-6xl mx-auto">
          <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900 mb-8">
            <div className="flex items-start gap-4">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company?.name || 'Company Name'}</h1>
                {company?.address && <p className="text-gray-600 text-sm mt-1">{company.address}</p>}
                {company?.contact1 && <p className="text-gray-600 text-sm">Phone: {company.contact1}</p>}
                {company?.email && <p className="text-gray-600 text-sm">Email: {company.email}</p>}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-extrabold tracking-wider text-blue-700">SYSTEM LOGS</h2>
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-gray-500">From: <span className="text-gray-900 font-semibold">{format(fromDate, 'dd MMM yyyy')}</span></p>
                <p className="text-gray-500">To: <span className="text-gray-900 font-semibold">{format(toDate, 'dd MMM yyyy')}</span></p>
                <p className="text-gray-500">Generated: <span className="text-gray-900 font-semibold">{new Date().toLocaleDateString()}</span></p>
                <p className="text-gray-500">Records: <span className="text-gray-900 font-semibold">{logs.length}</span></p>
              </div>
            </div>
          </header>

          <table className="w-full text-left border-collapse text-sm mb-8">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">#</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">Timestamp</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">User</th>
                <th className="border border-gray-300 p-2 text-center text-xs font-semibold uppercase tracking-wider">Type</th>
                <th className="border border-gray-300 p-2 text-center text-xs font-semibold uppercase tracking-wider">Action</th>
                <th className="border border-gray-300 p-2 text-center text-xs font-semibold uppercase tracking-wider">Module</th>
                <th className="border border-gray-300 p-2 text-center text-xs font-semibold uppercase tracking-wider">Page</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">Serials</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold uppercase tracking-wider">Description</th>
                <th className="border border-gray-300 p-2 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="border border-gray-300 p-4 text-center text-gray-500">No logs found for the selected period.</td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-blue-50/50">
                    <td className="border border-gray-300 p-2">{index + 1}</td>
                    <td className="border border-gray-300 p-2 whitespace-nowrap">{format(new Date(log.timestamp), 'dd MMM yyyy HH:mm')}</td>
                    <td className="border border-gray-300 p-2 font-semibold">{log.userName || '—'}</td>
                    <td className="border border-gray-300 p-2 text-center">{log.userRole || '-'}</td>
                    <td className="border border-gray-300 p-2 text-center">{log.action}</td>
                    <td className="border border-gray-300 p-2 text-center">{log.module}</td>
                    <td className="border border-gray-300 p-2 text-center">{log.page || '-'}</td>
                    <td className="border border-gray-300 p-2 font-mono text-xs">{log.serialNumbers || '—'}</td>
                    <td className="border border-gray-300 p-2">{log.description || '—'}</td>
                    <td className="border border-gray-300 p-2 text-center">{log.status}</td>
                  </tr>
                ))
              )}
            </tbody>
            {logs.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={9} className="border border-gray-300 p-2 text-right uppercase text-xs">Total Records</td>
                  <td className="border border-gray-300 p-2 text-center">{logs.length}</td>
                </tr>
              </tfoot>
            )}
          </table>

          <footer className="mt-12 pt-6 border-t border-gray-300">
            <div className="flex justify-between items-end">
              <div style={{ textAlign: 'center' }}>
                {stampUrl ? (
                  <img src={stampUrl} alt="Company Stamp" style={{ maxHeight: '80px', maxWidth: '180px', objectFit: 'contain', marginBottom: '5px' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}></div>
                )}
                <p className="text-xs text-gray-500">Company Stamp</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}></div>
                <p className="text-xs text-gray-500">Authorized Signature</p>
              </div>
            </div>
            <div className="text-center text-gray-600 mt-6">
              <p className="font-bold text-lg text-gray-900">{company?.name}</p>
              {company?.contact1 && <p className="text-sm mt-1">Phone: {company.contact1}{company?.email ? ` | Email: ${company.email}` : ''}</p>}
              <p className="text-xs text-gray-400 mt-2">Generated on {new Date().toLocaleString()}</p>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}