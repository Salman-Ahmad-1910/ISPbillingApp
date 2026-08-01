'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Receipt, ShoppingCart, TrendingUp, DollarSign, Eye, Download, Printer, ArrowLeft, CalendarDays } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import api from '@/lib/api';

export default function AbstractSalePage() {
  const { companyId, companies } = useCompany();

  const { data: sales = [], isLoading } = useGenericQuery<any>('pos/sales', companyId ?? undefined);

  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
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

  const filteredData = useMemo(() => {
    if (!showReport) return [];
    const [y, m] = month.split('-').map(Number);
    return (sales as any[]).filter((s) => {
      const d = new Date(s.date);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === y && d.getMonth() === m - 1;
    });
  }, [sales, showReport, month]);

  const kpiData = useMemo(() => [
    {
      title: 'Total Sales',
      value: filteredData.length,
      icon: ShoppingCart,
      gradient: 'from-teal-500 to-emerald-600',
    },
    {
      title: 'Total Revenue',
      value: filteredData.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0),
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-green-600',
    },
    {
      title: 'Total Tax',
      value: filteredData.reduce((s, i) => s + (Number(i.taxAmount) || 0), 0),
      icon: DollarSign,
      gradient: 'from-blue-500 to-cyan-600',
    },
  ], [filteredData]);

  const monthLabel = useMemo(() => {
    const [y, m] = month.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }, [month]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['#', 'Date', 'Customer', 'Payment Method', 'Items', 'Total Amount (PKR)', 'Tax (PKR)'];
    const rows = filteredData.map((item, i) => {
      const items = (item.items || []).map((it: any) => `${it.productName} x${it.quantity}`).join(', ');
      return [
        i + 1,
        new Date(item.date).toLocaleDateString(),
        `"${(item.subscriberName || '').replace(/"/g, '""')}"`,
        `"${(item.paymentMethod || '').replace(/"/g, '""')}"`,
        `"${items.replace(/"/g, '""')}"`,
        item.totalAmount,
        item.taxAmount,
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abstract-sale-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!companyId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Abstract Sale</h1>
            <p className="text-sm text-muted-foreground">View monthly sales summary across all transactions</p>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-teal-500/50 via-emerald-500/30 to-transparent" />
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
          <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Abstract Sale</h1>
            <p className="text-sm text-muted-foreground">View monthly sales summary across all transactions</p>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-teal-500/50 via-emerald-500/30 to-transparent" />
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
              <h2 className="text-3xl font-extrabold tracking-wider text-emerald-600">ABSTRACT SALE</h2>
              <p className="text-gray-500 text-sm mt-2">Month: {monthLabel}</p>
              <p className="text-gray-500 text-sm">Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-emerald-600 text-white">
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider text-left">#</th>
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider text-left">Date</th>
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider text-left">Customer</th>
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider text-left">Payment Method</th>
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider text-left">Items</th>
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider text-right">Total (PKR)</th>
                <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider text-right">Tax (PKR)</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-gray-300 p-6 text-center text-gray-500">No sales found for this month.</td>
                </tr>
              ) : (
                filteredData.map((item, i) => {
                  const items = (item.items || []);
                  const totalQty = items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0);
                  const itemSummary = items.slice(0, 2).map((it: any) => `${it.productName} x${it.quantity}`).join(', ');
                  return (
                    <tr key={item.id} className="hover:bg-emerald-50/50">
                      <td className="border border-gray-300 p-3 font-mono text-xs text-gray-500">{i + 1}</td>
                      <td className="border border-gray-300 p-3 text-gray-500">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="border border-gray-300 p-3 font-semibold">{item.subscriberName || 'Unknown'}</td>
                      <td className="border border-gray-300 p-3 capitalize">
                        {item.paymentMethod || '—'}
                        {item.isInstallment ? ' (Installment)' : ''}
                      </td>
                      <td className="border border-gray-300 p-3">
                        {totalQty} item{totalQty !== 1 ? 's' : ''}
                        <div className="text-xs text-gray-500">{itemSummary}{items.length > 2 ? '...' : ''}</div>
                      </td>
                      <td className="border border-gray-300 p-3 text-right font-semibold">{new Intl.NumberFormat('en-US').format(Number(item.totalAmount) || 0)}</td>
                      <td className="border border-gray-300 p-3 text-right text-gray-500">{new Intl.NumberFormat('en-US').format(Number(item.taxAmount) || 0)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot>
                <tr className="bg-emerald-50">
                  <td colSpan={5} className="border border-gray-300 p-3 text-right font-bold uppercase text-xs">Total</td>
                  <td className="border border-gray-300 p-3 text-right font-bold">{new Intl.NumberFormat('en-US').format(filteredData.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0))}</td>
                  <td className="border border-gray-300 p-3 text-right font-bold">{new Intl.NumberFormat('en-US').format(filteredData.reduce((s, i) => s + (Number(i.taxAmount) || 0), 0))}</td>
                </tr>
              </tfoot>
            )}
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
        <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm">
          <Receipt className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Abstract Sale</h1>
          <p className="text-sm text-muted-foreground">View monthly sales summary across all transactions</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-teal-500/50 via-emerald-500/30 to-transparent" />

      <div className="grid gap-4 md:grid-cols-3">
        {kpiData.map((kpi) => (
          <div key={kpi.title} className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                <p className="text-2xl font-bold mt-1">
                  {kpi.title === 'Total Sales'
                    ? kpi.value.toLocaleString()
                    : `PKR ${kpi.value.toLocaleString()}`}
                </p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex mt-6">
            <Button onClick={() => setShowReport(true)} className="w-32 bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-sm hover:shadow-md transition-all duration-300">
              <Eye className="mr-2 h-4 w-4" />
              Show
            </Button>
          </div>
        </CardContent>
      </Card>

      {showReport && (
        <Card className="transition-all duration-300 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
                Sales for {monthLabel}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2 transition-all duration-300 hover:shadow-md" onClick={handleExportCSV}>
                  <Download className="h-4 w-4" /> Export
                </Button>
                <Button variant="outline" size="sm" className="gap-2 transition-all duration-300 hover:shadow-md" onClick={() => setShowInvoice(true)}>
                  <Printer className="h-4 w-4" /> Print
                </Button>
              </div>
            </div>

            <div className="min-w-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total (PKR)</TableHead>
                    <TableHead className="text-right">Tax (PKR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No sales found for {monthLabel}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item, index) => {
                      const items = (item.items || []);
                      const totalQty = items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0);
                      const itemSummary = items.slice(0, 2).map((it: any) => `${it.productName} x${it.quantity}`).join(', ');
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(item.date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{item.subscriberName || 'Unknown'}</TableCell>
                          <TableCell>
                            <span className="capitalize">{item.paymentMethod || '—'}</span>
                            {item.isInstallment && (
                              <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                Installment
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {totalQty} item{totalQty !== 1 ? 's' : ''}
                            <div className="text-xs text-muted-foreground">
                              {itemSummary}{items.length > 2 ? '...' : ''}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{new Intl.NumberFormat('en-US').format(Number(item.totalAmount) || 0)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{new Intl.NumberFormat('en-US').format(Number(item.taxAmount) || 0)}</TableCell>
                        </TableRow>
                      );
                    })
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
