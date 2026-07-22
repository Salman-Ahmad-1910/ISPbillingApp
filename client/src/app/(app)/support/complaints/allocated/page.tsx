'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClipboardPen, MoreHorizontal, Edit3, Trash2, Search, ListTodo, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import type { Complaint } from '@/lib/types';

const statusColors: Record<string, string> = {
  'open': 'bg-yellow-100 text-yellow-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  'resolved': 'bg-green-100 text-green-800',
  'closed': 'bg-gray-100 text-gray-800',
};

const categoryColors: Record<string, string> = {
  'network': 'bg-blue-100 text-blue-800',
  'billing': 'bg-orange-100 text-orange-800',
  'service': 'bg-purple-100 text-purple-800',
};

export default function AllocatedComplaintPage() {
  const { companyId } = useCompany();

  const { data: complaints = [], isLoading } = useGenericQuery<Complaint>('support/complaints', companyId ?? undefined);

  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');

  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  const allocatedData = useMemo(() => complaints.filter(c => c.assignedToId), [complaints]);

  const kpiData = useMemo(() => [
    { title: 'Total Allocated', value: allocatedData.length, icon: ListTodo, gradient: 'from-blue-500 to-cyan-600' },
    { title: 'Open', value: allocatedData.filter(c => c.status === 'open').length, icon: Clock, gradient: 'from-amber-500 to-orange-600' },
    { title: 'Resolved', value: allocatedData.filter(c => c.status === 'resolved' || c.status === 'closed').length, icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600' },
    { title: 'In Progress', value: allocatedData.filter(c => c.status === 'in-progress').length, icon: Loader2, gradient: 'from-violet-500 to-purple-600' },
  ], [allocatedData]);

  const filteredData = useMemo(() => {
    return allocatedData.filter((c) => {
      if (category !== 'All' && c.category !== category) return false;
      if (status !== 'All' && c.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.subscriberName.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allocatedData, category, status, search]);

  const totalPages = Math.ceil(filteredData.length / parseInt(pageSize));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * parseInt(pageSize),
    currentPage * parseInt(pageSize)
  );

  if (!companyId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
            <ClipboardPen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Allocated Complaint</h1>
            <p className="text-sm text-muted-foreground">View complaints allocated to departments</p>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Please select a company to view allocated complaints.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
            <ClipboardPen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Allocated Complaint</h1>
            <p className="text-sm text-muted-foreground">View complaints allocated to departments</p>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="h-4 w-20 bg-muted animate-pulse rounded mb-2" />
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
          <ClipboardPen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Allocated Complaint</h1>
          <p className="text-sm text-muted-foreground">View complaints allocated to departments</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <div key={kpi.title} className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                <p className="text-2xl font-bold mt-1">{kpi.value}</p>
              </div>
              <div className={`rounded-lg bg-gradient-to-br ${kpi.gradient} p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="All">All Categories</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
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
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, subscriber or description..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-8"
              />
            </div>
          </div>

          <div className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Subscriber</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opened At</TableHead>
                  <TableHead className="w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No allocated complaints found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium">{item.subscriberName}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${categoryColors[item.category] || 'bg-gray-100 text-gray-800'}`}>
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="data-[highlighted]:text-emerald-600">
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive data-[highlighted]:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredData.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * parseInt(pageSize)) + 1} to {Math.min(currentPage * parseInt(pageSize), filteredData.length)} of {filteredData.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>Previous</Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(page)} className="w-8 h-8 p-0">{page}</Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
