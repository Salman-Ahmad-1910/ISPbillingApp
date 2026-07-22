'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Eye, Download, Printer, BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import type { Complaint } from '@/lib/types';

const statusColors: Record<string, string> = {
  'open': 'bg-yellow-100 text-yellow-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  'resolved': 'bg-green-100 text-green-800',
  'closed': 'bg-gray-100 text-gray-800',
};

export default function ComplaintReportPage() {
  const { companyId } = useCompany();

  const { data: complaints = [], isLoading } = useGenericQuery<Complaint>('support/complaints', companyId ?? undefined);

  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [showReport, setShowReport] = useState(false);

  const kpiData = useMemo(() => [
    { title: 'Total Complaints', value: complaints.length, icon: BarChart3, gradient: 'from-blue-500 to-cyan-600' },
    { title: 'Open', value: complaints.filter(r => r.status === 'open').length, icon: AlertCircle, gradient: 'from-amber-500 to-orange-600' },
    { title: 'Resolved', value: complaints.filter(r => r.status === 'resolved' || r.status === 'closed').length, icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600' },
  ], [complaints]);

  const filteredData = useMemo(() => {
    if (!showReport) return [];
    return complaints.filter((r) => {
      if (category !== 'All' && r.category !== category) return false;
      if (status !== 'All' && r.status !== status) return false;
      return true;
    });
  }, [complaints, showReport, category, status]);

  if (!companyId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Complaint Report</h1>
            <p className="text-sm text-muted-foreground">Generate and view complaint reports</p>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Please select a company to view reports.
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
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Complaint Report</h1>
            <p className="text-sm text-muted-foreground">Generate and view complaint reports</p>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Complaint Report</h1>
          <p className="text-sm text-muted-foreground">Generate and view complaint reports</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />

      <div className="grid gap-4 md:grid-cols-3">
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
                  <SelectValue />
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
                  <SelectValue />
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

          <div className="flex mt-6">
            <Button onClick={() => setShowReport(true)} className="w-32 bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:shadow-md transition-all duration-300">
              <Eye className="mr-2 h-4 w-4" />
              Show
            </Button>
          </div>
        </CardContent>
      </Card>

      {showReport && (
        <>
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="group rounded-xl border bg-card p-6 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                  <Label className="text-sm text-muted-foreground">Total Complaints</Label>
                  <p className="text-3xl font-bold mt-1">{complaints.length}</p>
                </div>
                <div className="group rounded-xl border bg-card p-6 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                  <Label className="text-sm text-muted-foreground">Open</Label>
                  <p className="text-3xl font-bold mt-1">{complaints.filter(r => r.status === 'open').length}</p>
                </div>
                <div className="group rounded-xl border bg-card p-6 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                  <Label className="text-sm text-muted-foreground">Resolved</Label>
                  <p className="text-3xl font-bold mt-1">{complaints.filter(r => r.status === 'resolved' || r.status === 'closed').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-md">
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Complaint History</h2>

              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" className="gap-2 transition-all duration-300 hover:shadow-md"><Download className="h-4 w-4" /> Export</Button>
                <Button variant="outline" size="sm" className="gap-2 transition-all duration-300 hover:shadow-md"><Printer className="h-4 w-4" /> Print</Button>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No complaint history found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{item.id.slice(0, 8)}</TableCell>
                          <TableCell className="font-medium">{item.subscriberName}</TableCell>
                          <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                              item.category === 'network' ? 'bg-blue-100 text-blue-800' :
                              item.category === 'billing' ? 'bg-orange-100 text-orange-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {item.category}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}`}>
                              {item.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
