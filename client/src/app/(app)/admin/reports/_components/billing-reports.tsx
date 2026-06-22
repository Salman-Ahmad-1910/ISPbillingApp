'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, TrendingUp, TrendingDown, FileText, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';

interface BillingData {
  id: string;
  date: string;
  period: string;
  invoicesGenerated: number;
  invoicesPaid: number;
  invoicesPending: number;
  invoicesOverdue: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  paymentMethods: { [method: string]: number };
  packageRevenue: { [packageName: string]: number };
  collectionRate: number;
  averageInvoiceAmount: number;
  latePayments: number;
}

interface BillingSummary {
  totalInvoices: number;
  totalRevenue: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  overallCollectionRate: number;
  averageInvoiceAmount: number;
  topRevenuePackage: string;
  paymentMethodBreakdown: { method: string; amount: number; percentage: number }[];
  monthlyTrend: { month: string; invoices: number; revenue: number; collectionRate: number }[];
  agingReport: {
    current: { count: number; amount: number };
    days1_30: { count: number; amount: number };
    days31_60: { count: number; amount: number };
    days61_90: { count: number; amount: number };
    over90: { count: number; amount: number };
  };
}

export function BillingReports() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BillingData[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  
  // Filters
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  });
  const [period, setPeriod] = useState<string>('daily');
  const [selectedPackage, setSelectedPackage] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('overview');
  
  const [packages, setPackages] = useState<{ id: string; name: string }[]>([]);

  const fetchBillingData = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const params = {
        companyId,
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        period,
        packageId: selectedPackage !== 'all' ? selectedPackage : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        reportType,
      };

      const response = await api.get('/reports/billing', { params });
      setData(response.data.data || []);
      setSummary(response.data.summary);
      setPackages(response.data.packages || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch billing data',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [companyId, dateRange, period, selectedPackage, selectedStatus, reportType]);

  const exportData = async () => {
    try {
      const params = {
        companyId,
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        period,
        packageId: selectedPackage !== 'all' ? selectedPackage : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        reportType,
        format: 'excel',
      };

      const response = await api.get('/reports/billing/export', { 
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `billing-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: 'Success', description: 'Report exported successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to export report',
      });
    }
  };

  const getCollectionBadge = (rate: number) => {
    if (rate >= 90) {
      return <Badge className="bg-green-100 text-green-800">{rate.toFixed(1)}%</Badge>;
    } else if (rate >= 75) {
      return <Badge className="bg-yellow-100 text-yellow-800">{rate.toFixed(1)}%</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">{rate.toFixed(1)}%</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Paid
        </Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Pending
        </Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Overdue
        </Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your billing report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Package</Label>
              <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packages</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchBillingData} disabled={loading}>
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>
            <Button variant="outline" onClick={exportData}>
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Total Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalInvoices.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Generated invoices</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₨{summary.totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total billed amount</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Collected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₨{summary.totalPaid.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Paid amount</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₨{(summary.totalPending + summary.totalOverdue).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Unpaid amount</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getCollectionBadge(summary.overallCollectionRate)}</div>
                <div className="text-xs text-muted-foreground">Payment success rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods & Aging Report */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.paymentMethodBreakdown.map((method) => (
                    <div key={method.method} className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium capitalize">{method.method}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">₨{method.amount.toLocaleString()}</span>
                        <Badge variant="outline">{method.percentage.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Aging Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-600">Current</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">₨{summary.agingReport.current.amount.toLocaleString()}</span>
                      <Badge variant="outline">{summary.agingReport.current.count}</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-yellow-600">1-30 Days</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">₨{summary.agingReport.days1_30.amount.toLocaleString()}</span>
                      <Badge variant="outline">{summary.agingReport.days1_30.count}</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-orange-600">31-60 Days</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">₨{summary.agingReport.days31_60.amount.toLocaleString()}</span>
                      <Badge variant="outline">{summary.agingReport.days31_60.count}</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-red-600">61-90 Days</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">₨{summary.agingReport.days61_90.amount.toLocaleString()}</span>
                      <Badge variant="outline">{summary.agingReport.days61_90.count}</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-red-800">Over 90 Days</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">₨{summary.agingReport.over90.amount.toLocaleString()}</span>
                      <Badge variant="destructive">{summary.agingReport.over90.count}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Analytics</CardTitle>
          <CardDescription>Invoice generation and payment collection metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Invoices Generated</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead>Total Revenue</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Collection Rate</TableHead>
                <TableHead>Avg Invoice</TableHead>
                <TableHead>Late Payments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading billing data...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    No billing data found for the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {period === 'daily' 
                        ? format(new Date(item.date), 'dd MMM yyyy')
                        : period === 'weekly'
                        ? `Week ${format(new Date(item.date), 'w MMM yyyy')}`
                        : format(new Date(item.date), 'MMM yyyy')
                      }
                    </TableCell>
                    <TableCell className="font-medium">{item.invoicesGenerated}</TableCell>
                    <TableCell className="text-green-600 font-medium">{item.invoicesPaid}</TableCell>
                    <TableCell className="text-yellow-600 font-medium">{item.invoicesPending}</TableCell>
                    <TableCell className="text-red-600 font-medium">{item.invoicesOverdue}</TableCell>
                    <TableCell className="font-medium">₨{item.totalRevenue.toLocaleString()}</TableCell>
                    <TableCell className="text-green-600 font-medium">₨{item.paidRevenue.toLocaleString()}</TableCell>
                    <TableCell>{getCollectionBadge(item.collectionRate)}</TableCell>
                    <TableCell>₨{item.averageInvoiceAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-orange-600">{item.latePayments}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
