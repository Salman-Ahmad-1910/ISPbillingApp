'use client';

import { useUser } from '@/hooks/use-user';
import { useEffect, useState } from 'react';

// Common & Homepage imports
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CircleDollarSign, MoveRight, Users, Package, Settings, HeadphonesIcon, ShieldCheck, Globe, TrendingUp, BarChart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Dashboard & Layout imports
import { AppShell } from '@/components/layout/app-shell';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ticket, AlertCircle } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamic imports for dashboard charts
const DailyCollectionChart = dynamic(
  () => import('@/app/(app)/dashboard/_components/daily-collection-chart').then(mod => mod.DailyCollectionChart),
  {
    loading: () => <Skeleton className="lg:col-span-4 h-80" />,
    ssr: false
  }
);
const SubscriberGrowthChart = dynamic(
  () => import('@/app/(app)/dashboard/_components/subscriber-growth-chart').then(mod => mod.SubscriberGrowthChart),
  {
    loading: () => <Skeleton className="lg:col-span-3 h-80" />,
    ssr: false
  }
);

function DashboardView() {
  const { companyId, companyName } = useCompany();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      setLoading(true);
      api.get(`/dashboard?companyId=${companyId}`)
        .then(response => {
          setData(response.data.data);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to fetch dashboard data", error);
          setLoading(false);
        });
    }
  }, [companyId]);

  const kpiData = !data ? [] : [
    { title: 'Active Subscribers', value: data.subscribersStats?.active || 0, icon: Users, change: `in ${companyName}` },
    { title: 'Total Collection (Today)', value: 'PKR 0', icon: CircleDollarSign, change: 'real-time total' },
    { title: 'Open Complaints', value: data.complaintsCount || 0, icon: Ticket, change: `in ${companyName}` },
    { title: 'Overdue Subscribers', value: data.subscribersStats?.suspended || 0, icon: AlertCircle, change: 'unpaid accounts' },
  ];

  if (loading) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Loading real-time overview..."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="lg:col-span-4 h-80" />
          <Skeleton className="lg:col-span-3 h-80" />
        </div>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHeader
          title="Error"
          description="Could not load dashboard data. Please try again later."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`${companyName || ''} Dashboard`}
        description="Here's a real-time overview of your network and business operations."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <DailyCollectionChart data={data.dailyCollection} />
        <SubscriberGrowthChart data={data.newSubscribers} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Payments</CardTitle>
              <Link href="/billing/payments" className="text-sm text-primary hover:underline">View All</Link>
            </div>
            <CardDescription>Latest payments received from subscribers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subscriber</TableHead>
                  <TableHead>Amount (PKR)</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.slice(0, 5).map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.subscriberName}</TableCell>
                    <TableCell>{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>{payment.paymentDate}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{payment.method}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Open Complaints</CardTitle>
              <Link href="/support/complaints" className="text-sm text-primary hover:underline">View All</Link>
            </div>
            <CardDescription>Tickets that need attention from the support team.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subscriber</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Opened On</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.complaints.filter((c: any) => c.status !== 'resolved' && c.status !== 'closed').slice(0, 5).map((complaint: any) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium">{complaint.subscriberName}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{complaint.category}</Badge></TableCell>
                    <TableCell>{new Date(complaint.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={complaint.status === 'open' ? 'destructive' : 'secondary'}
                      >
                        {complaint.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}


function HomePageView() {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-900 to-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Fintrack ERP</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
            <Link href="/about" className="text-gray-600 hover:text-gray-900 transition-colors">About</Link>
            <Link href="/contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild className="bg-gray-900 hover:bg-black text-white">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#E0E7FF] to-[#4F46E5] overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Mesh Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/20 via-[#2563EB]/10 to-transparent opacity-30" />

            {/* Floating Abstract Shapes */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-[#06B6D4]/20 to-transparent rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-40 right-20 w-96 h-96 bg-gradient-to-tr from-[#2563EB]/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-gradient-to-bl from-[#06B6D4]/15 to-transparent rounded-full blur-3xl animate-pulse delay-2000" />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(rgba(37, 99, 235, 0.03) 1px, transparent 1px), linear-gradient(rgba(37, 99, 235, 0.03) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }} />

            {/* Soft Shadow Layer */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/10" />
          </div>

          {/* Content */}
          <div className="relative z-20 flex items-center justify-center h-full px-4 md:px-6">
            <div className="max-w-7xl mx-auto text-center">
              <div className="space-y-8">
                {/* Badge */}
                <div className="animate-in fade-in slide-in-from-top-12 duration-700">
                  <Badge className="mt-8 mb-3 bg-white/10 backdrop-blur-sm text-[#2563EB] border-[#2563EB]/20 shadow-lg px-6 py-3 text-sm font-semibold tracking-wide">
                    🚀 Enterprise-Grade ISP Management Platform
                  </Badge>
                </div>

                {/* Headline */}
                <div className="animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-black leading-tight mb-6">
                    Complete Business Management
                    <br />
                    <span className="bg-gradient-to-r from-[#06B6D4] to-[#2563EB] bg-clip-text text-transparent drop-shadow-2xl">
                      Simplified & Powerful
                    </span>
                  </h1>
                  <p className="mx-auto max-w-3xl text-xl md:text-2xl text-black/90 leading-relaxed mb-12 font-light">
                    Transform your Internet Service Provider operations with our comprehensive ERP solution.
                    From subscriber management to network monitoring, everything you need in one powerful platform.
                  </p>
                </div>
                <div className="select-none text-center group">
                  <div className="text-3xl font-bold text-gray-900 group-hover:scale-110 transition-transform duration-300">99.9%</div>
                  <div className="text-sm text-gray-600">Uptime</div>
                </div>
                <div className="select-none text-center group">
                  <div className="text-3xl font-bold text-gray-900 group-hover:scale-110 transition-transform duration-300">24/7</div>
                  <div className="text-sm text-gray-600">Support</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gray-50 to-transparent rounded-full opacity-50" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-gray-50 to-transparent rounded-full opacity-50" />

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-gray-100 text-gray-800 border-gray-300 shadow-sm">Features</Badge>
              <h2 className="text-4xl font-bold text-[#0F172A] mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Comprehensive tools designed specifically for ISP operations and growth
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="select-none group border-gray-200 hover:border-[#2563EB] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white">
                <CardHeader>
                  <div className="w-14 h-14 bg-gradient-to-br from-[#06B6D4]/10 to-[#2563EB] rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors text-center w-full">Customer Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    Complete CRM system with detailed customer profiles, guarantor management, and communication tracking.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="select-none group border-gray-200 hover:border-[#2563EB] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white">
                <CardHeader>
                  <div className="w-14 h-14 bg-gradient-to-br from-[#06B6D4]/10 to-[#2563EB] rounded-xl flex items-center justify-center mx-auto mb-4">
                    <CircleDollarSign className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className=" text-center w-full text-xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">Billing & Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    Automated invoice generation, multiple payment methods, installment plans, and due date reminders.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="select-none group border-gray-200 hover:border-[#2563EB] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white">
                <CardHeader>
                  <div className="w-14 h-14 bg-gradient-to-br from-[#06B6D4]/10 to-[#2563EB] rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Package className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className=" text-center w-full text-xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">Inventory Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    Real-time stock tracking, product catalog management, service plans, and equipment allocation.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="select-none group border-gray-200 hover:border-[#2563EB] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white">
                <CardHeader>
                  <div className="w-14 h-14 bg-gradient-to-br from-[#06B6D4]/10 to-[#2563EB] rounded-xl flex items-center justify-center mx-auto mb-4">
                    <HeadphonesIcon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className=" text-center w-full text-xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">Support System</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    Complaint tracking, alert management, support tickets, and resolution tracking.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="select-none group border-gray-200 hover:border-[#2563EB] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white">
                <CardHeader>
                  <div className="w-14 h-14 bg-gradient-to-br from-[#06B6D4]/10 to-[#2563EB] rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Settings className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className=" text-center w-full text-xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">Admin & Control</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    User role management, company administration, dealer management, and system configuration.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="select-none group border-gray-200 hover:border-[#2563EB] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white">
                <CardHeader>
                  <div className="w-14 h-14 bg-gradient-to-br from-[#06B6D4]/10 to-[#2563EB] rounded-xl flex items-center justify-center mx-auto mb-4">
                    <BarChart className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className=" text-center w-full text-xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">Analytics & Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    Real-time analytics, custom reports, revenue tracking, and business intelligence dashboards.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

          </div>
        </section>

        {/* Roles Section */}
        <section className="py-20 bg-gradient-to-br from-gray-50 to-zinc-50 relative overflow-hidden">
          {/* Background elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-30">
            <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full blur-xl" />
            <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-tl from-gray-100 to-gray-200 rounded-full blur-xl" />
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-gray-100 text-gray-800 border-gray-300 shadow-sm">User Roles</Badge>
              <h2 className="text-4xl font-bold mb-4 text-gray-900 drop-shadow-sm">Perfect for Every Team Member</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Role-based access control ensures everyone has the right tools for their job
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="select-none text-center border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                    <div className="text-2xl">👑</div>
                  </div>
                  <CardTitle className="text-gray-900">Super Admin</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Complete system control</p>
                  <ul className="mt-4 space-y-2 text-xs text-left">
                    <li>• Full system access</li>
                    <li>• User management</li>
                    <li>• Company administration</li>
                    <li>• System configuration</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="select-none text-center border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                    <div className="text-2xl">👨‍💼</div>
                  </div>
                  <CardTitle className="text-gray-900">Admin</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Company-level management</p>
                  <ul className="mt-4 space-y-2 text-xs text-left">
                    <li>• Company operations</li>
                    <li>• Staff management</li>
                    <li>• Report access</li>
                    <li>• Customer support</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="select-none text-center border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                    <div className="text-2xl">💰</div>
                  </div>
                  <CardTitle className="text-gray-900">Billing Staff</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Financial operations</p>
                  <ul className="mt-4 space-y-2 text-xs text-left">
                    <li>• Invoice management</li>
                    <li>• Payment processing</li>
                    <li>• Ledger management</li>
                    <li>• Financial reports</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="select-none text-center border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                    <div className="text-2xl">🎧</div>
                  </div>
                  <CardTitle className="text-gray-900">Support Staff</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Customer service</p>
                  <ul className="mt-4 space-y-2 text-xs text-left">
                    <li>• Complaint handling</li>
                    <li>• Customer support</li>
                    <li>• Ticket management</li>
                    <li>• Service requests</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-20 bg-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-gray-50 to-transparent rounded-full opacity-60" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-gray-50 to-transparent rounded-full opacity-60" />

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <Badge className="mb-4 bg-gray-100 text-gray-800 border-gray-300 shadow-sm">About Fintrack ERP</Badge>
                <h2 className="text-4xl font-bold mb-4 text-gray-900 drop-shadow-sm">Empowering ISPs Worldwide Since 2020</h2>
                <p className="text-xl text-gray-600">
                  Built by professionals, for Internet Service Providers globally
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
                  <p className="text-gray-600 mb-6">
                    To provide ISPs worldwide with world-class management software that understands global business needs,
                    regulatory requirements, and market challenges. We're committed to helping ISPs grow their business
                    while providing exceptional service to their customers.
                  </p>

                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Why Choose Fintrack ERP?</h3>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                      <span>Designed for global market conditions and regulations</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                      <span>Support for multiple payment methods and currencies</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                      <span>24/7 multilingual customer support</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                      <span>Affordable pricing plans for businesses of all sizes</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <Card className="select-none border-gray-200 hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-gray-900 flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center shadow-md">
                          <span className="text-gray-900">�</span>
                        </div>
                        Global Platform
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        Proudly developed by international engineers who understand the unique challenges and opportunities
                        in the global ISP industry.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="select-none border-gray-200 hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-gray-900 flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center shadow-md">
                          <span className="text-gray-900">🚀</span>
                        </div>
                        Innovation First
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        Continuously evolving with new features and improvements based on feedback from thousands of
                        ISPs using our platform daily worldwide.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="select-none border-gray-200 hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-gray-900 flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center shadow-md">
                          <span className="text-gray-900">🤝</span>
                        </div>
                        Partnership Approach
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        We don't just provide software; we partner with you for success. Your growth is our success.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-[#0F172A] mb-4">
                Trusted by Industry Leaders
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Join thousands of ISPs who rely on our platform for mission-critical operations
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="select-none text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-[#06B6D4]/10 to-[#2563EB] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-2xl transition-all duration-300 transform group-hover:scale-110">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors mb-2">10,000+</div>
                <div className="text-sm text-gray-600 font-medium">Active Subscribers</div>
              </div>

              <div className="select-none text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-[#06B6D4]/10 to-[#2563EB] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-2xl transition-all duration-300 transform group-hover:scale-110">
                  <ShieldCheck className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors mb-2">99.9%</div>
                <div className="text-sm text-gray-600 font-medium">Uptime SLA</div>
              </div>

              <div className="select-none text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-[#06B6D4]/10 to-[#2563EB] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-2xl transition-all duration-300 transform group-hover:scale-110">
                  <Globe className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors mb-2">500+</div>
                <div className="text-sm text-gray-600 font-medium">Global ISPs</div>
              </div>

              <div className="select-none text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-[#06B6D4]/10 to-[#2563EB] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-2xl transition-all duration-300 transform group-hover:scale-110">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors mb-2">24/7</div>
                <div className="text-sm text-gray-600 font-medium">Expert Support</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-gray-900 to-black relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-800 to-transparent" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-gray-700 to-transparent rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
                Ready to Transform Your ISP Business?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Join thousands of ISPs worldwide who trust Fintrack ERP for their daily operations
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" asChild className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                  <Link href="/signup" className="group">
                    Start Your Free Trial
                    <MoveRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                {/* <Button size="lg" variant="outline" className="border-white text-black hover:bg-white hover:text-gray-900 px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  Schedule Demo
                </Button> */}
              </div>

              <div className="mt-12 text-gray-300 select-none">
                <p className="text-sm mb-2">No credit card required • 14-day free trial • Cancel anytime</p>
                <div className="flex justify-center gap-8 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-600 rounded-full shadow-sm" />
                    <span>Free Setup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-600 rounded-full shadow-sm" />
                    <span>Data Migration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-600 rounded-full shadow-sm" />
                    <span>24/7 Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-gray-50">
        <div className="container mx-auto py-12 px-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              © 2026 Fintrack ERP. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Page() {
  const { user } = useUser();

  if (user === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (user) {
    return (
      <AppShell>
        <DashboardView />
      </AppShell>
    );
  }

  return <HomePageView />;
}
