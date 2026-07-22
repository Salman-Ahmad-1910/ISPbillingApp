'use client';

import { useState, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Download, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import type { User } from '@/lib/types';

interface CreatorSummary {
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  creatorRole: string;
  creatorStatus: string;
  createdUsers: User[];
  totalCreated: number;
}

export default function CreatorSummaryPage() {
  const { companyId } = useCompany();
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: users = [], isLoading: loading } = useGenericQuery<User>('admin/users', companyId ?? undefined);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const creatorSummaries: CreatorSummary[] = useMemo(() => {
    const creatorsMap = new Map<string, User[]>();

    users.forEach((user) => {
      if (user.createdBy) {
        const existing = creatorsMap.get(user.createdBy) || [];
        existing.push(user);
        creatorsMap.set(user.createdBy, existing);
      }
    });

    const creatorIds = new Set(creatorsMap.keys());
    return Array.from(creatorIds)
      .map((creatorId) => {
        const creator = users.find((u) => u.id === creatorId);
        const createdUsers = creatorsMap.get(creatorId) || [];
        return {
          creatorId,
          creatorName: creator?.name || 'Unknown',
          creatorEmail: creator?.email || '',
          creatorRole: creator?.role || '',
          creatorStatus: creator?.status || 'inactive',
          createdUsers,
          totalCreated: createdUsers.length,
        };
      })
      .filter((summary) => {
        const matchSearch =
          !searchTerm ||
          summary.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          summary.creatorEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchRole = roleFilter === 'all' || summary.creatorRole === roleFilter;
        return matchSearch && matchRole;
      })
      .sort((a, b) => b.totalCreated - a.totalCreated);
  }, [users, searchTerm, roleFilter]);

  const uniqueRoles = useMemo(() => {
    const set = new Set<string>();
    creatorSummaries.forEach((s) => {
      if (s.creatorRole) set.add(s.creatorRole);
    });
    return Array.from(set);
  }, [creatorSummaries]);

  const totalCreators = creatorSummaries.length;
  const totalCreatedUsers = creatorSummaries.reduce((sum, s) => sum + s.totalCreated, 0);
  const avgUsersPerCreator = totalCreators > 0 ? (totalCreatedUsers / totalCreators).toFixed(1) : '0';

  const exportExcel = () => {
    if (creatorSummaries.length === 0) return;

    const headers = ['Creator Name', 'Email', 'Role', 'Status', 'Total Created Users'];
    const rows = creatorSummaries.map((item) => [
      item.creatorName,
      item.creatorEmail,
      item.creatorRole,
      item.creatorStatus,
      item.totalCreated.toString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `creator-summary-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 no-print">
        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 shadow-sm">
          <UserPlus className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">User Creator Summary</h1>
          <p className="text-sm text-muted-foreground">Overview of users grouped by their creator</p>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-transparent" />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Creators</p>
            <UserPlus className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:scale-110" />
          </div>
          <p className="text-2xl font-bold mt-2">{totalCreators}</p>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Created Users</p>
            <UserPlus className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:scale-110" />
          </div>
          <p className="text-2xl font-bold mt-2">{totalCreatedUsers}</p>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Avg Users / Creator</p>
            <UserPlus className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:scale-110" />
          </div>
          <p className="text-2xl font-bold mt-2">{avgUsersPerCreator}</p>
        </div>
      </div>

      {/* Filter Row */}
      <Card className="no-print">
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
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-bold mb-4">Creator Summary</h2>

          {loading ? (
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
                    <TableHead>Users Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creatorSummaries.map((item, i) => (
                    <TableRow key={item.creatorId}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{item.creatorName}</TableCell>
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
  );
}
