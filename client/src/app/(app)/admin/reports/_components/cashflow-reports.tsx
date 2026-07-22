'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';

interface CashFlowData {
  id: string;
  date: string;
  description: string;
  category: 'revenue' | 'expense' | 'investment' | 'loan';
  subcategory: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  balance: number;
  reference: string;
  createdBy: string;
}

interface CashFlowSummary {
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  revenueBreakdown: { [key: string]: number };
  expenseBreakdown: { [key: string]: number };
  monthlyTrend: { month: string; inflow: number; outflow: number; net: number }[];
}

export function CashFlowReports() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CashFlowData[]>([]);
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  
  // Filters
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('detailed');

  const fetchCashFlowData = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const params = {
        companyId,
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        reportType,
      };

      const response = await api.get('/reports/cashflow', { params });
      setData(response.data.data || []);
      setSummary(response.data.summary);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch cash flow data',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlowData();
  }, [companyId, dateRange, selectedCategory, reportType]);

  const exportData = async () => {
    try {
      const params = {
        companyId,
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        reportType,
        format: 'excel',
      };

      const response = await api.get('/reports/cashflow/export', { 
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cashflow-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'revenue':
        return <Badge className="bg-green-100 text-green-800">Revenue</Badge>;
      case 'expense':
        return <Badge className="bg-red-100 text-red-800">Expense</Badge>;
      case 'investment':
        return <Badge className="bg-blue-100 text-blue-800">Investment</Badge>;
      case 'loan':
        return <Badge className="bg-purple-100 text-purple-800">Loan</Badge>;
      default:
        return <Badge variant="secondary">Other</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your cash flow report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="monthly">Monthly Trend</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchCashFlowData} disabled={loading}>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4 text-green-600" />
                  Total Inflow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₨{summary.totalInflow.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Cash received</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-red-600" />
                  Total Outflow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₨{summary.totalOutflow.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Cash spent</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Net Cash Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₨{Math.abs(summary.netCashFlow).toLocaleString()}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {summary.netCashFlow >= 0 ? (
                    <><TrendingUp className="mr-1 h-3 w-3" /> Positive flow</>
                  ) : (
                    <><TrendingDown className="mr-1 h-3 w-3" /> Negative flow</>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Closing Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₨{summary.closingBalance.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  Opening: ₨{summary.openingBalance.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue & Expense Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(summary.revenueBreakdown).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">{category}</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        ₨{amount.toLocaleString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(summary.expenseBreakdown).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">{category}</span>
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        ₨{amount.toLocaleString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Details</CardTitle>
          <CardDescription>Detailed cash inflows and outflows</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subcategory</TableHead>
                <TableHead>Inflow</TableHead>
                <TableHead>Outflow</TableHead>
                <TableHead>Net Flow</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Created By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading cash flow data...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    No cash flow data found for the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(new Date(item.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell>{getCategoryBadge(item.category)}</TableCell>
                    <TableCell className="capitalize">{item.subcategory}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {item.inflow > 0 ? `₨${item.inflow.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {item.outflow > 0 ? `₨${item.outflow.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className={`font-medium ${item.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₨{Math.abs(item.netFlow).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">₨{item.balance.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.reference}</TableCell>
                    <TableCell className="text-sm">{item.createdBy}</TableCell>
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
