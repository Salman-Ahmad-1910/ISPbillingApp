'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Eye, Download, Printer, BarChart3, AlertCircle, CheckCircle2, Clock, ArrowLeft } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import api from '@/lib/api';
import type { Complaint } from '@/lib/types';

const statusColors: Record<string, string> = {
  'open': 'bg-yellow-100 text-yellow-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  'resolved': 'bg-green-100 text-green-800',
  'done': 'bg-green-100 text-green-800',
  'closed': 'bg-gray-100 text-gray-800',
};

export default function ComplaintReportPage() {
  const { companyId, companies } = useCompany();

  const { data: complaints = [], isLoading } = useGenericQuery<Complaint>('support/complaints', companyId ?? undefined);

  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [showReport, setShowReport] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const company = useMemo(() => {
    return (companies as any[] || []).find((c: any) => c.id === companyId);
  }, [companies, companyId]);

  const logoUrl = company?.logo
    ? `${api?.defaults?.baseURL || ''}/uploads/company_images/${company.id}`
    : null;

  const stampUrl = company?.stamp
    ? `${api?.defaults?.baseURL || ''}/uploads/company_stamps/${company.id}`
    : null;

  const kpiData = useMemo(() => [
    { title: 'Total Complaints', value: complaints.length, icon: BarChart3, gradient: 'from-blue-500 to-cyan-600' },
    { title: 'Open', value: complaints.filter(r => r.status === 'open').length, icon: AlertCircle, gradient: 'from-amber-500 to-orange-600' },
    { title: 'In Progress', value: complaints.filter(r => r.status === 'in-progress').length, icon: Clock, gradient: 'from-violet-500 to-purple-600' },
    { title: 'Resolved', value: complaints.filter(r => r.status === 'resolved' || r.status === 'done' || r.status === 'closed').length, icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600' },
  ], [complaints]);

  const filteredData = useMemo(() => {
    if (!showReport) return [];
    return complaints.filter((r) => {
      if (category !== 'All' && r.category !== category) return false;
      if (status !== 'All' && r.status !== status) return false;
      return true;
    });
  }, [complaints, showReport, category, status]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['#', 'Subscriber', 'Description', 'Category', 'Status', 'Opened At'];
    const rows = filteredData.map((item, i) => [
      i + 1,
      item.subscriberName,
      `"${item.description.replace(/"/g, '""')}"`,
      item.category,
      item.status,
      new Date(item.createdAt).toLocaleDateString(),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complaint-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <div className="grid gap-4 md:grid-cols-4">
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

  if (showInvoice) {
    return (
      <div className="flex flex-col gap-6">
        <div className="print-area bg-white text-gray-900 rounded-xl border shadow-sm p-6 md:p-10">
          <div className="flex justify-between no-print mb-4">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowInvoice(false)}>
              <ArrowLeft className="h-4 w-4" /> Back to Report
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>

          <div className="flex justify-between items-start pb-6 border-b-2 border-emerald-600 mb-8">
            <div className="flex items-start gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="w-14 h-14 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company?.name || 'Company Name'}</h1>
                <p className="text-gray-500 text-sm mt-1">{company?.address || ''}</p>
                {company?.email && <p className="text-gray-500 text-sm">Email: {company.email}</p>}
                {company?.contact1 && <p className="text-gray-500 text-sm">Phone: {company.contact1}</p>}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-extrabold tracking-wider text-emerald-600">COMPLAINT REPORT</h2>
              <p className="text-gray-500 text-sm mt-2">Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-emerald-600 text-white">
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider text-left">#</th>
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider text-left">Subscriber</th>
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider text-left">Description</th>
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider text-left">Category</th>
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider text-left">Status</th>
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider text-left">Opened At</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-gray-300 p-6 text-center text-gray-500">No complaints found.</td>
                </tr>
              ) : (
                filteredData.map((item, i) => (
                  <tr key={item.id} className="hover:bg-emerald-50/50">
                    <td className="border border-gray-300 p-3 font-mono text-xs text-gray-500">{i + 1}</td>
                    <td className="border border-gray-300 p-3 font-semibold">{item.subscriberName}</td>
                    <td className="border border-gray-300 p-3 max-w-xs">{item.description}</td>
                    <td className="border border-gray-300 p-3 capitalize">{item.category}</td>
                    <td className="border border-gray-300 p-3 capitalize">{item.status}</td>
                    <td className="border border-gray-300 p-3 text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-10 pt-6 border-t border-gray-300 flex justify-between items-end">
            <div className="text-center">
              {stampUrl ? (
                <img
                  src={stampUrl}
                  alt="Company Stamp"
                  className="max-h-20 max-w-48 object-contain mb-1"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-48 border-b border-gray-900 mb-1"></div>
              )}
              <p className="text-xs text-gray-500">Company Stamp</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-b border-gray-900 mb-1"></div>
              <p className="text-xs text-gray-500">Authorized Signature</p>
            </div>
          </div>

          <div className="text-center text-gray-400 text-xs mt-6">
            <p className="font-semibold text-gray-900">{company?.name || 'Company Name'}</p>
            <p className="mt-1">Phone: {company?.contact1} | Email: {company?.email}</p>
            <p className="mt-2">This is a computer-generated report and does not require a signature</p>
          </div>
        </div>

        <style jsx global>{`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area {
              position: absolute !important;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
            .no-print { display: none !important; }
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page { size: A4 landscape; margin: 12mm; }
            table, th, td { border-color: #d1d5db !important; }
            th { background-color: #059669 !important; color: white !important; }
          }
        `}</style>
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

      <div className="grid gap-4 md:grid-cols-4">
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
                  <SelectItem value="done">Done</SelectItem>
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
        <Card className="transition-all duration-300 hover:shadow-md">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">Complaint History</h2>

            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" className="gap-2 transition-all duration-300 hover:shadow-md" onClick={handleExportCSV}>
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button variant="outline" size="sm" className="gap-2 transition-all duration-300 hover:shadow-md" onClick={() => setShowInvoice(true)}>
                <Printer className="h-4 w-4" /> Print
              </Button>
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
                    filteredData.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
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
      )}
    </div>
  );
}
