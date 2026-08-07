'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Download, Printer, Loader2, Search } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import type { User, Connection } from '@/lib/types';
import { smartMatch } from '@/lib/search';
import { format } from 'date-fns';
import { SubscriberReportInvoice, type InvoiceColumn } from '@/components/shared/subscriber-report-print';

interface CreatorSummary {
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  creatorRole: string;
  creatorStatus: string;
  createdConnections: Connection[];
  totalCreated: number;
}

export default function CreatorSummaryPage() {
  const { companyId } = useCompany();

  const { data: users = [], isLoading: loading } = useGenericQuery<User>('admin/users', companyId ?? undefined, { includeAdmin: true });
  const { data: connections = [], isLoading: loadingConnections } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showInvoice, setShowInvoice] = useState(false);

  const creatorSummaries: CreatorSummary[] = useMemo(() => {
    const creatorsMap = new Map<string, Connection[]>();

    connections.forEach((conn) => {
      if (conn.createdBy) {
        const existing = creatorsMap.get(conn.createdBy) || [];
        existing.push(conn);
        creatorsMap.set(conn.createdBy, existing);
      }
    });

    return Array.from(creatorsMap.keys())
      .map((creatorId) => {
        const creator = users.find((u) => u.id === creatorId);
        const createdConnections = creatorsMap.get(creatorId) || [];
        return {
          creatorId,
          creatorName: creator?.name || 'Unknown',
          creatorEmail: creator?.email || '',
          creatorRole: creator?.role || '',
          creatorStatus: creator?.status || 'inactive',
          createdConnections,
          totalCreated: createdConnections.length,
        };
      })
      .filter((summary) => {
        const matchSearch = !searchTerm || smartMatch(searchTerm, [], [summary.creatorName, summary.creatorEmail]);
        const matchRole = roleFilter === 'all' || summary.creatorRole === roleFilter;
        return matchSearch && matchRole;
      })
      .sort((a, b) => b.totalCreated - a.totalCreated);
  }, [connections, users, searchTerm, roleFilter]);

  const uniqueRoles = useMemo(() => {
    const set = new Set<string>();
    creatorSummaries.forEach((s) => { if (s.creatorRole) set.add(s.creatorRole); });
    return Array.from(set);
  }, [creatorSummaries]);

  const totalCreators = creatorSummaries.length;
  const totalCreatedUsers = creatorSummaries.reduce((sum, s) => sum + s.totalCreated, 0);
  const avgUsersPerCreator = totalCreators > 0 ? (totalCreatedUsers / totalCreators).toFixed(1) : '0';

  const exportExcel = () => {
    if (creatorSummaries.length === 0) return;

    const headers = ['Creator Name', 'Email', 'Role', 'Status', 'Subscribers Created'];
    const rows = creatorSummaries.map((item) => [
      item.creatorName, item.creatorEmail, item.creatorRole, item.creatorStatus, item.totalCreated.toString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `subscribers-creator-summary-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setShowInvoice(true);
  };

  if (showInvoice) {
    const accent = { title: 'text-purple-600', border: 'border-purple-600', headerBg: 'bg-purple-600', rowHover: 'hover:bg-purple-50/50' };
    const columns: InvoiceColumn<CreatorSummary>[] = [
      { header: '#', render: (_: CreatorSummary, i: number) => <span className="font-mono text-xs text-gray-500">{i + 1}</span> },
      { header: 'Creator Name', render: (r) => <span className="font-semibold">{r.creatorName}</span> },
      { header: 'Email', render: (r) => r.creatorEmail || '-' },
      { header: 'Role', render: (r) => r.creatorRole || '-' },
      { header: 'Status', render: (r) => <span className="capitalize">{r.creatorStatus}</span> },
      { header: 'Subscribers Created', align: 'right', render: (r) => <span className="font-bold">{r.totalCreated}</span> },
    ];

    return (
      <div className="p-6">
        <SubscriberReportInvoice<CreatorSummary>
          title="SUBSCRIBERS CREATOR SUMMARY"
          subtitle="Subscribers grouped by the staff member who created them"
          accent={accent}
          data={creatorSummaries}
          columns={columns}
          emptyMessage="No creator summaries found."
          onBack={() => setShowInvoice(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 no-print">
        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 shadow-sm">
          <UserPlus className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscribers Creator Summary</h1>
          <p className="text-sm text-muted-foreground">Subscribers created by each staff member</p>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-purple-500/50 via-pink-500/30 to-transparent no-print" />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Creators</p>
              <p className="text-2xl font-bold mt-1">{totalCreators}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <UserPlus className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Subscribers Created</p>
              <p className="text-2xl font-bold mt-1">{totalCreatedUsers}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <UserPlus className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
                <p className="text-xs font-medium text-muted-foreground">Avg Subscribers / Creator</p>
              <p className="text-2xl font-bold mt-1">{avgUsersPerCreator}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <UserPlus className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="no-print transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={exportExcel} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printable Report Section */}
      <div className="print-report">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Subscribers Creator Summary</h2>
                <p className="text-sm text-muted-foreground mt-1">Subscribers created by each staff member</p>
              </div>
              <div className="flex gap-2 no-print">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>

            {loading || loadingConnections ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : creatorSummaries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No creator summaries found.
              </div>
            ) : (
              <div className="min-w-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Creator Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Subscribers Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creatorSummaries.map((item, i) => (
                      <TableRow key={item.creatorId}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/admin/users?search=${encodeURIComponent(item.creatorName)}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {item.creatorName}
                          </Link>
                        </TableCell>
                        <TableCell>{item.creatorEmail}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.creatorRole}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.creatorStatus === 'active' ? 'default' : 'secondary'}
                            className={item.creatorStatus === 'active' ? 'bg-green-600' : ''}>
                            {item.creatorStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-lg">{item.totalCreated}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
