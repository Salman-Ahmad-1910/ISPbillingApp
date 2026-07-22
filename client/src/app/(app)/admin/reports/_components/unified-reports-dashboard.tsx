'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, TrendingUp, Filter, RefreshCw, DollarSign, Users, CreditCard, Activity, FileText, Wallet, HandCoins, ArrowUpCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

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

const statCardClasses = "group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg";

function StatCard({ icon: Icon, label, value, subtext, gradient }: { icon: any; label: string; value: React.ReactNode; subtext: string; gradient: string }) {
  return (
    <div className={statCardClasses}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-xl ${gradient} text-white shadow-md`}>
          <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <p className="text-xs text-muted-foreground">{subtext}</p>
    </div>
  );
}

export function UnifiedReportsDashboard() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [selectedOfficer, setSelectedOfficer] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [recoveryData, setRecoveryData] = useState<RecoveryData[]>([]);
  const [outstandingData, setOutstandingData] = useState<OutstandingData[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [subscriberData, setSubscriberData] = useState<SubscriberData[]>([]);
  const [billingData, setBillingData] = useState<BillingData[]>([]);

  const [availableOfficers, setAvailableOfficers] = useState<{id: string, name: string}[]>([]);
  const [availableAreas, setAvailableAreas] = useState<{id: string, name: string}[]>([]);

  const [recoveryPage, setRecoveryPage] = useState(1);
  const [outstandingPage, setOutstandingPage] = useState(1);
  const [cashFlowPage, setCashFlowPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const [subscriberPage, setSubscriberPage] = useState(1);
  const [billingPage, setBillingPage] = useState(1);

  const itemsPerPage = 10;

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
              className={`w-8 h-8 p-0 ${currentPage === page ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : ''}`}
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

  const [recoverySummary, setRecoverySummary] = useState<RecoverySummary | null>(null);
  const [outstandingSummary, setOutstandingSummary] = useState<OutstandingSummary | null>(null);
  const [cashFlowSummary, setCashFlowSummary] = useState<CashFlowSummary | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [subscriberSummary, setSubscriberSummary] = useState<SubscriberSummary | null>(null);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);

  const fetchAllData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = {
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        officer: selectedOfficer !== 'all' ? selectedOfficer : undefined,
        area: selectedArea !== 'all' ? selectedArea : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      };

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

      const recoveryDataArray = recoveryRes.data?.data?.data || [];
      const outstandingDataArray = outstandingRes.data?.data?.data || [];
      const cashFlowDataArray = cashFlowRes.data?.data?.data || [];
      const salesDataArray = salesRes.data?.data?.data || [];
      const subscriberDataArray = subscriberRes.data?.data?.data || [];
      const billingDataArray = billingRes.data?.data?.data || [];

      setRecoveryData(recoveryDataArray);
      setOutstandingData(outstandingDataArray);
      setCashFlowData(cashFlowDataArray);
      setSalesData(salesDataArray);
      setSubscriberData(subscriberDataArray);
      setBillingData(billingDataArray);

      const officersSet = new Set<string>();
      const areasSet = new Set<string>();

      recoveryDataArray.forEach((item: RecoveryData) => {
        if (item.recoveryOfficer && item.recoveryOfficer !== 'Unknown') officersSet.add(item.recoveryOfficer);
        if (item.area && item.area !== 'Unknown Area') areasSet.add(item.area);
      });
      outstandingDataArray.forEach((item: OutstandingData) => {
        if (item.recoveryOfficer && item.recoveryOfficer !== 'Unassigned') officersSet.add(item.recoveryOfficer);
        if (item.area && item.area !== 'Unknown Area') areasSet.add(item.area);
      });
      cashFlowDataArray.forEach((item: CashFlowData) => {
        if (item.createdBy && item.createdBy !== 'Unknown') officersSet.add(item.createdBy);
      });

      setAvailableOfficers(Array.from(officersSet).map(name => ({ id: name, name })));
      setAvailableAreas(Array.from(areasSet).map(name => ({ id: name, name })));

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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

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

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: 'Export successful', description: `${reportType} report exported successfully` });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: error.response?.data?.message || 'Failed to export report',
      });
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [companyId, dateRange, selectedOfficer, selectedArea, selectedStatus]);

  const kpis = [
    { icon: Wallet, label: 'Total Recovery', value: recoverySummary ? `₨${recoverySummary?.totalCollected?.toLocaleString() || 0}` : '₨0', subtext: recoverySummary ? `${recoverySummary?.collectionRate || 0}% collection rate` : 'No data', gradient: 'bg-gradient-to-br from-emerald-500 to-green-600' },
    { icon: DollarSign, label: 'Outstanding', value: outstandingSummary ? `₨${outstandingSummary?.totalOutstanding?.toLocaleString() || 0}` : '₨0', subtext: outstandingSummary ? `${outstandingSummary?.overdueAccounts || 0} overdue` : 'No data', gradient: 'bg-gradient-to-br from-orange-500 to-red-600' },
    { icon: Activity, label: 'Net Cash Flow', value: cashFlowSummary?.netCashFlow ? `₨${cashFlowSummary.netCashFlow.toLocaleString()}` : '₨0', subtext: cashFlowSummary ? `This period` : 'No data', gradient: 'bg-gradient-to-br from-blue-500 to-cyan-600' },
    { icon: CreditCard, label: 'Total Sales', value: salesSummary ? `₨${salesSummary?.totalRevenue?.toLocaleString() || 0}` : '₨0', subtext: salesSummary ? `${(salesSummary as any)?.newSubscribers || 0} new subs` : 'No data', gradient: 'bg-gradient-to-br from-violet-500 to-purple-600' },
    { icon: Users, label: 'Active Subscribers', value: subscriberSummary ? ((subscriberSummary?.totalSubscribers || (subscriberSummary as any)?.currentTotal || 0)).toLocaleString() : '0', subtext: subscriberSummary ? `${subscriberSummary?.churnRate || 0}% churn rate` : 'No data', gradient: 'bg-gradient-to-br from-teal-500 to-emerald-600' },
    { icon: FileText, label: 'Total Billed', value: billingSummary ? `₨${((billingSummary as any)?.totalRevenue || billingSummary?.totalBilled || 0).toLocaleString()}` : '₨0', subtext: billingSummary ? `₨${((billingSummary as any)?.pendingRevenue || billingSummary?.pendingAmount || 0).toLocaleString()} pending` : 'No data', gradient: 'bg-gradient-to-br from-indigo-500 to-blue-600' },
  ];

  const gradientHeader = (icon: any, title: string, description: string, gradient: string) => (
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2.5 rounded-xl ${gradient} text-white shadow-md`}>
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );

  const emptyRow = (colSpan: number, message: string) => (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your business operations and performance metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />

      <Card className="hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 text-white">
              <Filter className="h-4 w-4" />
            </div>
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                        <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
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
                    selected={{ from: dateRange.from, to: dateRange.to }}
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

            <div className="space-y-2">
              <Label>Recovery Officer</Label>
              <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select officer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Officers</SelectItem>
                  {availableOfficers.map((officer) => (
                    <SelectItem key={officer.id} value={officer.id}>{officer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Area</Label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {availableAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
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
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={fetchAllData}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="recovery">
          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                {gradientHeader(<HandCoins className="h-5 w-5" />, 'Recovery Reports', 'Track collection performance and recovery metrics across different periods.', 'bg-gradient-to-br from-emerald-500 to-green-600')}
              </div>
              <Button onClick={() => handleExport('recovery')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : (
                <div className="min-w-0 overflow-x-auto">
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
                      {recoveryData.length === 0 ? emptyRow(8, 'No recovery data available for the selected period.') : (
                        getPaginatedData(recoveryData, recoveryPage).map((item: any) => (
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
                </div>
              )}
            </CardContent>
          </Card>
          {renderPagination(recoveryPage, setRecoveryPage, getTotalPages(recoveryData))}
        </TabsContent>

        <TabsContent value="outstanding">
          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                {gradientHeader(<DollarSign className="h-5 w-5" />, 'Outstanding Reports', 'Monitor outstanding payments, overdue accounts, and collection targets.', 'bg-gradient-to-br from-orange-500 to-red-600')}
              </div>
              <Button onClick={() => handleExport('outstanding')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : (
                <div className="min-w-0 overflow-x-auto">
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
                      {outstandingData.length === 0 ? emptyRow(6, 'No outstanding data available for the selected period.') : (
                        getPaginatedData(outstandingData, outstandingPage).map((item: any) => (
                          <TableRow key={item?.id}>
                            <TableCell>{item?.subscriberName}</TableCell>
                            <TableCell>₨{item?.outstandingAmount?.toLocaleString()}</TableCell>
                            <TableCell>{item?.dueDate ? format(new Date(item?.dueDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                            <TableCell>{item?.daysOverdue}</TableCell>
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
                </div>
              )}
            </CardContent>
          </Card>
          {renderPagination(outstandingPage, setOutstandingPage, getTotalPages(outstandingData))}
        </TabsContent>

        <TabsContent value="cashflow">
          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                {gradientHeader(<ArrowUpCircle className="h-5 w-5" />, 'Cash Flow Reports', 'Analyze cash inflows, outflows, and overall financial health.', 'bg-gradient-to-br from-blue-500 to-cyan-600')}
              </div>
              <Button onClick={() => handleExport('cashflow')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : (
                <div className="min-w-0 overflow-x-auto">
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
                      {cashFlowData.length === 0 ? emptyRow(5, 'No cash flow data available for the selected period.') : (
                        getPaginatedData(cashFlowData, cashFlowPage).map((item: any) => (
                          <TableRow key={item.date}>
                            <TableCell>{format(new Date(item.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell className="text-green-600 font-medium">+₨{item.inflow.toLocaleString()}</TableCell>
                            <TableCell className="text-red-600 font-medium">-₨{item.outflow.toLocaleString()}</TableCell>
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
                </div>
              )}
            </CardContent>
          </Card>
          {renderPagination(cashFlowPage, setCashFlowPage, getTotalPages(cashFlowData))}
        </TabsContent>

        <TabsContent value="sales">
          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                {gradientHeader(<TrendingUp className="h-5 w-5" />, 'Sales Summary Reports', 'Comprehensive sales data including subscriptions, packages, and revenue trends.', 'bg-gradient-to-br from-violet-500 to-purple-600')}
              </div>
              <Button onClick={() => handleExport('sales')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : (
                <div className="min-w-0 overflow-x-auto">
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
                      {salesData.length === 0 ? emptyRow(5, 'No sales data available for selected period.') : (
                        getPaginatedData(salesData, salesPage).map((item: any) => (
                          <TableRow key={item?.id}>
                            <TableCell>{format(new Date(item?.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="font-medium text-green-600">{item?.newSubscribers}</TableCell>
                            <TableCell className="font-medium">₨{item?.revenue?.toLocaleString()}</TableCell>
                            <TableCell>{item?.topSellingPackage}</TableCell>
                            <TableCell><Badge variant="default">Active</Badge></TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          {renderPagination(salesPage, setSalesPage, getTotalPages(salesData))}
        </TabsContent>

        <TabsContent value="subscribers">
          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                {gradientHeader(<Users className="h-5 w-5" />, 'Subscriber Reports', 'Subscriber growth, churn rates, and demographic analysis.', 'bg-gradient-to-br from-teal-500 to-emerald-600')}
              </div>
              <Button onClick={() => handleExport('subscribers')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : (
                <div className="min-w-0 overflow-x-auto">
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
                      {subscriberData.length === 0 ? emptyRow(5, 'No subscriber data available for the selected period.') : (
                        getPaginatedData(subscriberData, subscriberPage).map((item: any) => (
                          <TableRow key={item?.id}>
                            <TableCell>{item?.date}</TableCell>
                            <TableCell className="font-medium">{item?.totalSubscribers}</TableCell>
                            <TableCell className="text-green-600">{item?.newSubscribers}</TableCell>
                            <TableCell className="font-medium">{item?.netGrowth}</TableCell>
                            <TableCell>
                              <Badge variant={item?.growthRate > 0 ? 'default' : 'secondary'}>
                                {item?.growthRate}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          {renderPagination(subscriberPage, setSubscriberPage, getTotalPages(subscriberData))}
        </TabsContent>

        <TabsContent value="billing">
          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                {gradientHeader(<FileText className="h-5 w-5" />, 'Billing Reports', 'Invoice generation, payment processing, and billing analytics.', 'bg-gradient-to-br from-indigo-500 to-blue-600')}
              </div>
              <Button onClick={() => handleExport('billing')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : (
                <div className="min-w-0 overflow-x-auto">
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
                      {billingData.length === 0 ? emptyRow(6, 'No billing data available for the selected period.') : (
                        getPaginatedData(billingData, billingPage).map((item: any) => (
                          <TableRow key={item?.id}>
                            <TableCell>{item?.date}</TableCell>
                            <TableCell className="font-medium">{item?.invoicesGenerated}</TableCell>
                            <TableCell className="font-medium">₨{item?.totalRevenue?.toLocaleString()}</TableCell>
                            <TableCell>{item?.collectionRate?.toFixed(1)}%</TableCell>
                            <TableCell>
                              <Badge variant={item?.collectionRate > 90 ? 'default' : item?.collectionRate > 50 ? 'secondary' : 'destructive'}>
                                {item?.collectionRate > 90 ? 'Good' : item?.collectionRate > 50 ? 'Fair' : 'Poor'}
                              </Badge>
                            </TableCell>
                            <TableCell>₨{item?.averageInvoiceAmount?.toFixed(0)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          {renderPagination(billingPage, setBillingPage, getTotalPages(billingData))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
