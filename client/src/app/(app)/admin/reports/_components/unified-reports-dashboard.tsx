'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, TrendingUp, TrendingDown, Filter, RefreshCw, DollarSign, Users, CreditCard, Activity, FileText } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';

// Types for different report data
interface RecoveryData {
  date: string;
  recoveryOfficer: string;
  area: string;
  amountCollected: number;
  targetAmount: number;
  accountsVisited: number;
  paymentsCollected: number;
  pendingPayments: number;
}

interface OutstandingData {
  id: string;
  subscriberName: string;
  subscriberId: string;
  area: string;
  package: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: string;
  daysOverdue: number;
  lastPaymentDate: string;
  status: string;
  recoveryOfficer: string;
}

interface CashFlowData {
  id: string;
  date: string;
  description: string;
  category: string;
  subcategory: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  balance: number;
  reference: string;
  createdBy: string;
}

interface SalesData {
  id: string;
  date: string;
  period: string;
  newSubscribers: number;
  totalSubscribers: number;
  revenue: number;
  packagesSold: string;
  churnedSubscribers: number;
  netGrowth: number;
  averageRevenuePerUser: number;
  topSellingPackage: string;
  salesOfficer: string;
}

interface SubscriberData {
  id: string;
  date: string;
  period: string;
  totalSubscribers: number;
  newSubscribers: number;
  churnedSubscribers: number;
  netGrowth: number;
  growthRate: number;
  activeSubscribers: number;
  inactiveSubscribers: number;
  suspendedSubscribers: number;
  areaBreakdown: string;
  packageBreakdown: string;
  averageTenure: number;
  churnRate: number;
}

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
  paymentMethods: string;
  packageRevenue: string;
  collectionRate: number;
  averageInvoiceAmount: number;
  latePayments: number;
}

// Summary types
interface RecoverySummary {
  totalCollected: number;
  totalTarget: number;
  collectionRate: number;
  totalAccounts: number;
  totalPayments: number;
  pendingCount: number;
}

interface OutstandingSummary {
  totalOutstanding: number;
  overdueAmount: number;
  totalAccounts: number;
  overdueAccounts: number;
}

interface CashFlowSummary {
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
  period: string;
}

interface SalesSummary {
  totalRevenue: number;
  totalSales: number;
  averageSaleValue: number;
  growthRate: number;
}

interface SubscriberSummary {
  totalSubscribers: number;
  activeSubscribers: number;
  churnRate: number;
  newSubscribers: number;
  monthlyRevenue: number;
}

interface BillingSummary {
  totalBilled: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}

export function UnifiedReportsDashboard() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Global filters
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [selectedOfficer, setSelectedOfficer] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Data states
  const [recoveryData, setRecoveryData] = useState<RecoveryData[]>([]);
  const [outstandingData, setOutstandingData] = useState<OutstandingData[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [subscriberData, setSubscriberData] = useState<SubscriberData[]>([]);
  const [billingData, setBillingData] = useState<BillingData[]>([]);
  
  // Filter options
  const [availableOfficers, setAvailableOfficers] = useState<{id: string, name: string}[]>([]);
  const [availableAreas, setAvailableAreas] = useState<{id: string, name: string}[]>([]);
  
  // Pagination states
  const [recoveryPage, setRecoveryPage] = useState(1);
  const [outstandingPage, setOutstandingPage] = useState(1);
  const [cashFlowPage, setCashFlowPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const [subscriberPage, setSubscriberPage] = useState(1);
  const [billingPage, setBillingPage] = useState(1);
  
  const itemsPerPage = 10;

  // Pagination helpers
  const getPaginatedData = <T,>(data: T[], page: number): T[] => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data: any[]): number => {
    return Math.ceil(data.length / itemsPerPage);
  };

  const renderPagination = (currentPage: number, setCurrentPage: (page: number) => void, totalPages: number) => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-center space-x-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        
        <div className="flex items-center space-x-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className="w-8 h-8 p-0"
            >
              {page}
            </Button>
          ))}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    );
  };

  // Summary states
  const [recoverySummary, setRecoverySummary] = useState<RecoverySummary | null>(null);
  const [outstandingSummary, setOutstandingSummary] = useState<OutstandingSummary | null>(null);
  const [cashFlowSummary, setCashFlowSummary] = useState<CashFlowSummary | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [subscriberSummary, setSubscriberSummary] = useState<SubscriberSummary | null>(null);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);

  // Fetch all data
  const fetchAllData = async () => {
    if (!companyId) {
      console.log('No companyId, skipping fetch');
      return;
    }
    
    console.log('Fetching data with companyId:', companyId);
    setLoading(true);
    try {
      const params = {
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        officer: selectedOfficer !== 'all' ? selectedOfficer : undefined,
        area: selectedArea !== 'all' ? selectedArea : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      };
      
      console.log('Request params:', params);

      // Fetch all report data in parallel
      const [
        recoveryRes,
        outstandingRes,
        cashFlowRes,
        salesRes,
        subscriberRes,
        billingRes,
      ] = await Promise.all([
        api.get('/reports/recovery', { params }),
        api.get('/reports/outstanding-reports', { params }),
        api.get('/reports/cashflow', { params }),
        api.get('/reports/sales', { params }),
        api.get('/reports/subscribers', { params }),
        api.get('/reports/billing-reports', { params }),
      ]);

      // Set data
      console.log('=== API RESPONSES ===');
      console.log('Full recovery response:', recoveryRes);
      console.log('Recovery data array:', recoveryRes?.data?.data);
      console.log('Recovery summary:', recoveryRes?.data?.summary);
      
      console.log('Full outstanding response:', outstandingRes);
      console.log('Outstanding data array:', outstandingRes?.data?.data);
      console.log('Outstanding summary:', outstandingRes?.data?.summary);
      
      console.log('Full cashflow response:', cashFlowRes);
      console.log('Cashflow data array:', cashFlowRes?.data?.data);
      console.log('Cashflow summary:', cashFlowRes?.data?.summary);
      
      console.log('Full sales response:', salesRes);
      console.log('Sales data array:', salesRes?.data?.data);
      console.log('Sales summary:', salesRes?.data?.summary);
      
      console.log('Full subscriber response:', subscriberRes);
      console.log('Subscriber data array:', subscriberRes?.data?.data);
      console.log('Subscriber summary:', subscriberRes?.data?.summary);
      
      console.log('Full billing response:', billingRes);
      console.log('Billing data array:', billingRes?.data?.data);
      console.log('Billing summary:', billingRes?.data?.summary);
      
      console.log('=== DETAILED DATA STRUCTURE ===');
      console.log('recoveryRes.data:', recoveryRes.data);
      console.log('recoveryRes.data.data:', recoveryRes.data.data);
      console.log('recoveryRes.data.data.data:', recoveryRes.data.data?.data);
      console.log('Array check - recoveryRes.data.data.data:', Array.isArray(recoveryRes.data.data?.data));
      
      console.log('=== SUMMARY STRUCTURE ===');
      console.log('Recovery summary:', recoveryRes.data?.data?.summary);
      console.log('Outstanding summary:', outstandingRes.data?.data?.summary);
      console.log('CashFlow summary:', cashFlowRes.data?.data?.summary);
      console.log('Sales summary:', salesRes.data?.data?.summary);
      console.log('Subscriber summary:', subscriberRes.data?.data?.summary);
      console.log('Billing summary:', billingRes.data?.data?.summary);
      
      const recoveryDataArray = recoveryRes.data?.data?.data || [];
      const outstandingDataArray = outstandingRes.data?.data?.data || [];
      const cashFlowDataArray = cashFlowRes.data?.data?.data || [];
      const salesDataArray = salesRes.data?.data?.data || [];
      const subscriberDataArray = subscriberRes.data?.data?.data || [];
      const billingDataArray = billingRes.data?.data?.data || [];
      
      console.log('=== FINAL DATA ARRAYS ===');
      console.log('Recovery data array length:', recoveryDataArray.length);
      console.log('Outstanding data array length:', outstandingDataArray.length);
      console.log('CashFlow data array length:', cashFlowDataArray.length);
      console.log('Sales data array length:', salesDataArray.length);
      console.log('Subscriber data array length:', subscriberDataArray.length);
      console.log('Billing data array length:', billingDataArray.length);
      
      setRecoveryData(recoveryDataArray);
      setOutstandingData(outstandingDataArray);
      setCashFlowData(cashFlowDataArray);
      setSalesData(salesDataArray);
      setSubscriberData(subscriberDataArray);
      setBillingData(billingDataArray);

      // Extract officers and areas from responses
      const officersSet = new Set<string>();
      const areasSet = new Set<string>();
      
      // Extract from recovery data
      recoveryDataArray.forEach(item => {
        if (item.recoveryOfficer && item.recoveryOfficer !== 'Unknown') {
          officersSet.add(item.recoveryOfficer);
        }
        if (item.area && item.area !== 'Unknown Area') {
          areasSet.add(item.area);
        }
      });
      
      // Extract from outstanding data
      outstandingDataArray.forEach(item => {
        if (item.recoveryOfficer && item.recoveryOfficer !== 'Unassigned') {
          officersSet.add(item.recoveryOfficer);
        }
        if (item.area && item.area !== 'Unknown Area') {
          areasSet.add(item.area);
        }
      });
      
      // Extract from cash flow data
      cashFlowDataArray.forEach(item => {
        if (item.createdBy && item.createdBy !== 'Unknown') {
          officersSet.add(item.createdBy);
        }
      });
      
      // Convert to arrays for dropdowns
      const officersList = Array.from(officersSet).map(name => ({ id: name, name }));
      const areasList = Array.from(areasSet).map(name => ({ id: name, name }));
      
      setAvailableOfficers(officersList);
      setAvailableAreas(areasList);
      
      console.log('Extracted officers:', officersList);
      console.log('Extracted areas:', areasList);

      // Set summaries
      setRecoverySummary(recoveryRes.data?.data?.summary);
      setOutstandingSummary(outstandingRes.data?.data?.summary);
      setCashFlowSummary(cashFlowRes.data?.data?.summary);
      setSalesSummary(salesRes.data?.data?.summary);
      setSubscriberSummary(subscriberRes.data?.data?.summary);
      setBillingSummary(billingRes.data?.data?.summary);

      toast({
        title: 'Reports refreshed',
        description: 'All reports have been updated with the latest data.',
      });
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      console.error('Error response:', error.response);
      toast({
        variant: 'destructive',
        title: 'Error fetching reports',
        description: error.response?.data?.message || 'Failed to load reports data',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // Export data
  const handleExport = async (reportType: string) => {
    try {
      const params = {
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        officer: selectedOfficer !== 'all' ? selectedOfficer : undefined,
        area: selectedArea !== 'all' ? selectedArea : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        format: 'excel',
      };

      const response = await api.get(`/reports/${reportType}/export`, { 
        params,
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `${reportType} report exported successfully`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: error.response?.data?.message || 'Failed to export report',
      });
    }
  };

  useEffect(() => {
    console.log('useEffect triggered with:', { companyId, dateRange, selectedOfficer, selectedArea, selectedStatus });
    fetchAllData();
  }, [companyId, dateRange, selectedOfficer, selectedArea, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive insights into your business operations and performance metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Global Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
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
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{
                        from: dateRange.from,
                        to: dateRange.to,
                      }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Recovery Officer Filter */}
              <div className="space-y-2">
                <Label>Recovery Officer</Label>
                <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select officer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Officers</SelectItem>
                    {availableOfficers.map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        {officer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Area Filter */}
              <div className="space-y-2">
                <Label>Area</Label>
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {availableAreas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Apply Filters Button */}
              <div className="flex items-end">
                <Button onClick={fetchAllData} className="w-full">
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recovery</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {console.log("recoverySummary: ",recoverySummary)}
            <div className="text-2xl font-bold">
              {recoverySummary ? `₨${recoverySummary?.totalCollected?.toLocaleString() || 0}` : '₨0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {recoverySummary ? `${recoverySummary?.collectionRate || 0}% collection rate` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {outstandingSummary ? `₨${outstandingSummary?.totalOutstanding?.toLocaleString() || 0}` : '₨0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {outstandingSummary ? `${outstandingSummary?.overdueAccounts || 0} overdue` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cashFlowSummary?.netCashFlow ? `₨${cashFlowSummary.netCashFlow.toLocaleString()}` : '₨0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {cashFlowSummary ? `This period` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesSummary ? `₨${salesSummary?.totalRevenue?.toLocaleString() || 0}` : '₨0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {salesSummary ? `${salesSummary?.newSubscribers || 0} new subs` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriberSummary ? (subscriberSummary?.totalSubscribers || subscriberSummary?.currentTotal || 0).toLocaleString() : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {subscriberSummary ? `${subscriberSummary?.churnRate || 0}% churn rate` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billingSummary ? `₨${(billingSummary?.totalRevenue || billingSummary?.totalBilled || 0).toLocaleString()}` : '₨0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {billingSummary ? `₨${(billingSummary?.pendingRevenue || billingSummary?.pendingAmount || 0).toLocaleString()} pending` : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Recovery Reports Tab */}
        <TabsContent value="recovery">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recovery Reports</CardTitle>
                <CardDescription>
                  Track collection performance and recovery metrics across different periods.
                </CardDescription>
              </div>
              <Button onClick={() => handleExport('recovery')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Officer</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Accounts</TableHead>
                      <TableHead>Payments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recoveryData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No recovery data available for the selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      getPaginatedData(recoveryData, recoveryPage).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{format(new Date(item.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{item.recoveryOfficer}</TableCell>
                          <TableCell>{item.area}</TableCell>
                          <TableCell>₨{item.amountCollected.toLocaleString()}</TableCell>
                          <TableCell>₨{item.targetAmount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={item.amountCollected >= item.targetAmount ? 'default' : 'secondary'}>
                              {Math.round((item.amountCollected / item.targetAmount) * 100)}%
                            </Badge>
                          </TableCell>
                          <TableCell>{item.accountsVisited}</TableCell>
                          <TableCell>{item.paymentsCollected}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {renderPagination(recoveryPage, setRecoveryPage, getTotalPages(recoveryData))}
        </TabsContent>

        {/* Outstanding Reports Tab */}
        <TabsContent value="outstanding">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Outstanding Reports</CardTitle>
                <CardDescription>
                  Monitor outstanding payments, overdue accounts, and collection targets.
                </CardDescription>
              </div>
              <Button onClick={() => handleExport('outstanding')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recovery Officer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstandingData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No outstanding data available for the selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      getPaginatedData(outstandingData, outstandingPage).map((item) => (
                        <TableRow key={item?.id}>
                          <TableCell>{item?.subscriberName}</TableCell>
                          <TableCell>₨{item?.outstandingAmount?.toLocaleString()}</TableCell>
                          <TableCell>{item?.dueDate ? format(new Date(item?.dueDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={item.status === 'overdue' ? 'destructive' : item.status === 'critical' ? 'secondary' : 'default'}>
                              {item?.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{item?.recoveryOfficer}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {renderPagination(outstandingPage, setOutstandingPage, getTotalPages(outstandingData))}
        </TabsContent>

        {/* Cash Flow Reports Tab */}
        <TabsContent value="cashflow">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cash Flow Reports</CardTitle>
                <CardDescription>
                  Analyze cash inflows, outflows, and overall financial health.
                </CardDescription>
              </div>
              <Button onClick={() => handleExport('cashflow')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Inflow</TableHead>
                      <TableHead>Outflow</TableHead>
                      <TableHead>Net Flow</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashFlowData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No cash flow data available for the selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      getPaginatedData(cashFlowData, cashFlowPage).map((item) => (
                        <TableRow key={item.date}>
                          <TableCell>{format(new Date(item.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className="text-green-600">
                            +₨{item.inflow.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-red-600">
                            -₨{item.outflow.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.netFlow >= 0 ? 'default' : 'destructive'}>
                              {item.netFlow >= 0 ? '+' : ''}₨{item.netFlow.toLocaleString()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {renderPagination(cashFlowPage, setCashFlowPage, getTotalPages(cashFlowData))}
        </TabsContent>

        {/* Sales Reports Tab */}
        <TabsContent value="sales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sales Summary Reports</CardTitle>
                <CardDescription>
                  Comprehensive sales data including subscriptions, packages, and revenue trends.
                </CardDescription>
              </div>
              <Button onClick={() => handleExport('sales')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>New Subscribers</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Top Package</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No sales data available for selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      getPaginatedData(salesData, salesPage).map((item) => (
                        <TableRow key={item?.id}>
                          <TableCell>{format(new Date(item?.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{item?.newSubscribers}</TableCell>
                          <TableCell>₨{item?.revenue?.toLocaleString()}</TableCell>
                          <TableCell>{item?.topSellingPackage}</TableCell>
                          <TableCell>
                            <Badge variant="default">
                              Active
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {renderPagination(salesPage, setSalesPage, getTotalPages(salesData))}
        </TabsContent>

        {/* Subscriber Reports Tab */}
        <TabsContent value="subscribers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Subscriber Reports</CardTitle>
                <CardDescription>
                  Subscriber growth, churn rates, and demographic analysis.
                </CardDescription>
              </div>
              <Button onClick={() => handleExport('subscribers')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Subscribers</TableHead>
                      <TableHead>New Subscribers</TableHead>
                      <TableHead>Net Growth</TableHead>
                      <TableHead>Growth Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriberData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No subscriber data available for the selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      getPaginatedData(subscriberData, subscriberPage).map((item) => (
                        <TableRow key={item?.id}>
                          <TableCell>{item?.date}</TableCell>
                          <TableCell>{item?.totalSubscribers}</TableCell>
                          <TableCell>{item?.newSubscribers}</TableCell>
                          <TableCell>{item?.netGrowth}</TableCell>
                          <TableCell>
                            <Badge variant={
                              item?.growthRate > 0 ? 'default' : 'secondary'
                            }>
                              {item?.growthRate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {renderPagination(subscriberPage, setSubscriberPage, getTotalPages(subscriberData))}
        </TabsContent>

        {/* Billing Reports Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Billing Reports</CardTitle>
                <CardDescription>
                  Invoice generation, payment processing, and billing analytics.
                </CardDescription>
              </div>
              <Button onClick={() => handleExport('billing')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoices Generated</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Collection Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Avg Invoice Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No billing data available for the selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      getPaginatedData(billingData, billingPage).map((item) => (
                        <TableRow key={item?.id}>
                          <TableCell>{item?.date}</TableCell>
                          <TableCell>{item?.invoicesGenerated}</TableCell>
                          <TableCell>₨{item?.totalRevenue?.toLocaleString()}</TableCell>
                          <TableCell>{item?.collectionRate?.toFixed(1)}%</TableCell>
                          <TableCell>
                            <Badge variant={
                              item?.collectionRate > 90 ? 'default' : 
                              item?.collectionRate > 50 ? 'secondary' : 'destructive'
                            }>
                              {item?.collectionRate > 90 ? 'Good' : 
                               item?.collectionRate > 50 ? 'Fair' : 'Poor'}
                            </Badge>
                          </TableCell>
                          <TableCell>₨{item?.averageInvoiceAmount?.toFixed(0)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {renderPagination(billingPage, setBillingPage, getTotalPages(billingData))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
