'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CircleDollarSign, MoveRight, Users, Package, Settings, HeadphonesIcon, ShieldCheck, Globe, TrendingUp, BarChart } from 'lucide-react';
import Link from 'next/link';

function HomePageView() {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#04070F]/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400/30 to-indigo-500/30 border border-white/25 rounded-lg flex items-center justify-center backdrop-blur-md">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-lg font-bold text-white">Fintrack ERP</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/features" className="text-slate-300 hover:text-white transition-colors">Features</Link>
            <Link href="/about" className="text-slate-300 hover:text-white transition-colors">About</Link>
            <Link href="/contact" className="text-slate-300 hover:text-white transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="text-slate-200 hover:text-white hover:bg-white/10">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild className="bg-white hover:bg-slate-100 text-gray-900">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative min-h-screen bg-[#04070F] overflow-hidden">
          {/* Telecom towers and fibre cabling sit behind the glass panel so the
              backdrop-blur on it has real depth to refract. */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-bottom bg-no-repeat"
              style={{ backgroundImage: 'url(/images/hero-towers.jpg)' }}
            />
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
              style={{ backgroundImage: 'url(/images/hero-fiber.jpg)' }}
            />
            {/* Source photos vary in brightness, so the wash is heavy enough to
                hold white text at AAA contrast over any of them. */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B1220]/93 via-[#0F172A]/82 to-[#020617]/95" />
            <div className="absolute top-24 left-[12%] w-80 h-80 bg-gradient-to-br from-[#22D3EE]/25 to-transparent rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-52 right-[14%] w-96 h-96 bg-gradient-to-tr from-[#4F46E5]/30 to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute bottom-24 left-1/2 w-96 h-96 bg-gradient-to-bl from-[#A855F7]/20 to-transparent rounded-full blur-3xl animate-pulse delay-2000" />
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(rgba(148, 163, 184, 0.04) 1px, transparent 1px), linear-gradient(rgba(148, 163, 184, 0.04) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }} />
            {/* Vignette keeps the copy legible over the busiest part of the art. */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/75 via-[#020617]/40 to-[#020617]/95" />
          </div>

          <div className="relative z-20 flex items-center justify-center min-h-screen px-4 py-24 md:px-6">
            <div className="w-full max-w-5xl">
              <div className="rounded-[2rem] border border-white/20 bg-white/[0.07] p-8 shadow-[0_8px_60px_-12px_rgba(34,211,238,0.35)] backdrop-blur-2xl backdrop-saturate-150 md:p-14">
                <div className="space-y-8 text-center">
                  <div className="animate-in fade-in slide-in-from-top-12 duration-700">
                    <Badge className="mb-3 border-white/25 bg-white/10 text-cyan-100 shadow-lg backdrop-blur-md px-6 py-3 text-sm font-semibold tracking-wide">
                      Enterprise-Grade ISP Management Platform
                    </Badge>
                  </div>

                  <div className="animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight mb-6 drop-shadow-2xl">
                      Complete Business Management
                      <br />
                      <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                        Simplified &amp; Powerful
                      </span>
                    </h1>
                    <p className="mx-auto max-w-3xl text-xl md:text-2xl text-slate-200/90 leading-relaxed mb-12 font-light">
                      Transform your Internet Service Provider operations with our comprehensive ERP solution.
                      From subscriber management to network monitoring, everything you need in one powerful platform.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white relative overflow-hidden">
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
                  <CardTitle className="text-center w-full text-xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">Billing & Payments</CardTitle>
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
                  <CardTitle className="text-center w-full text-xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">Inventory Management</CardTitle>
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
                  <CardTitle className="text-center w-full text-xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">Support System</CardTitle>
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
                  <CardTitle className="text-center w-full text-xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">Admin & Control</CardTitle>
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
                  <CardTitle className="text-center w-full text-xl font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">Analytics & Reports</CardTitle>
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

        <section className="py-20 bg-gradient-to-br from-gray-50 to-zinc-50 relative overflow-hidden">
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
                    <span className="text-2xl">KB</span>
                  </div>
                  <CardTitle className="text-gray-900">Super Admin</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Complete system control</p>
                  <ul className="mt-4 space-y-2 text-xs text-left">
                    <li>Full system access</li>
                    <li>User management</li>
                    <li>Company administration</li>
                    <li>System configuration</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="select-none text-center border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                    <span className="text-2xl">AD</span>
                  </div>
                  <CardTitle className="text-gray-900">Admin</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Company-level management</p>
                  <ul className="mt-4 space-y-2 text-xs text-left">
                    <li>Company operations</li>
                    <li>Staff management</li>
                    <li>Report access</li>
                    <li>Customer support</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="select-none text-center border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                    <span className="text-2xl">BI</span>
                  </div>
                  <CardTitle className="text-gray-900">Billing Staff</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Financial operations</p>
                  <ul className="mt-4 space-y-2 text-xs text-left">
                    <li>Invoice management</li>
                    <li>Payment processing</li>
                    <li>Ledger management</li>
                    <li>Financial reports</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="select-none text-center border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                    <span className="text-2xl">SP</span>
                  </div>
                  <CardTitle className="text-gray-900">Support Staff</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Customer service</p>
                  <ul className="mt-4 space-y-2 text-xs text-left">
                    <li>Complaint handling</li>
                    <li>Customer support</li>
                    <li>Ticket management</li>
                    <li>Service requests</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-gray-50 to-transparent rounded-full opacity-60" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-gray-50 to-transparent rounded-full opacity-60" />

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <Badge className="mb-4 bg-gray-100 text-gray-800 border-gray-300 shadow-sm">About Fintrack ERP</Badge>
                <h2 className="text-4xl font-bold mb-4 text-gray-900 drop-shadow-sm">Empowering ISPs Worldwide Since 2020</h2>
                <p className="text-xl text-gray-600">Built by professionals, for Internet Service Providers globally</p>
              </div>

              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
                  <p className="text-gray-600 mb-6">
                    To provide ISPs worldwide with world-class management software that understands global business needs,
                    regulatory requirements, and market challenges. We are committed to helping ISPs grow their business
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
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-gradient-to-r from-gray-900 to-black relative overflow-hidden">
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
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-gray-50">
        <div className="container mx-auto py-12 px-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              2026 Fintrack ERP. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Page() {
  return <HomePageView />;
}
