'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CircleDollarSign, Package, HeadphonesIcon, Settings, ShieldCheck, TrendingUp, Zap, Globe } from 'lucide-react';
import Link from 'next/link';

export default function FeaturesPage() {
  const features = [
    {
      icon: Users,
      title: "Customer Management",
      description: "Complete CRM solution with detailed customer profiles, guarantor management, and communication tracking.",
      category: "CRM"
    },
    {
      icon: CircleDollarSign,
      title: "Billing & Payments",
      description: "Automated invoice generation, multiple payment methods, installment plans, and due date reminders.",
      category: "Billing"
    },
    {
      icon: Package,
      title: "Inventory Management",
      description: "Real-time stock tracking, product catalog management, service plans, and equipment allocation.",
      category: "Inventory"
    },
    {
      icon: HeadphonesIcon,
      title: "Support System",
      description: "Complaint tracking, alert management, support tickets, and resolution tracking.",
      category: "Support"
    },
    {
      icon: Settings,
      title: "Admin & Control",
      description: "User role management, company administration, dealer management, and system configuration.",
      category: "Admin"
    },
    {
      icon: ShieldCheck,
      title: "Human Resources",
      description: "Staff management, attendance tracking, employee advances, and performance monitoring.",
      category: "HR"
    },
    {
      icon: TrendingUp,
      title: "Analytics & Reports",
      description: "Real-time dashboards, financial reports, customer analytics, and business insights.",
      category: "Analytics"
    },
    {
      icon: Zap,
      title: "Automation Tools",
      description: "Automated workflows, scheduled tasks, notification systems, and process optimization.",
      category: "Automation"
    },
    {
      icon: Globe,
      title: "Multi-Tenant Support",
      description: "Company isolation, role-based access, global deployment, and multi-currency support.",
      category: "Enterprise"
    }
  ];

  const categories = ["All", "CRM", "Billing", "Inventory", "Support", "Admin", "HR", "Analytics", "Automation", "Enterprise"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-900 to-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Fintrack ERP</span>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Features</h1>
          <p className="text-xl text-gray-600">Everything you need to manage your ISP business efficiently</p>
        </div>
      </header>

      {/* Features Grid */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-gray-900" />
                </div>
                <CardTitle className="text-gray-900">{feature.title}</CardTitle>
                <Badge className="w-fit bg-gray-100 text-gray-800 border-gray-300">
                  {feature.category}
                </Badge>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your ISP Business?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of ISPs worldwide who trust Fintrack ERP for comprehensive business management.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/signup" className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-lg font-medium transition-colors">
              Start Free Trial
            </Link>
            <Link href="/login" className="border border-gray-900 text-gray-900 hover:bg-gray-50 px-8 py-3 rounded-lg font-medium transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 mt-16">
        <div className="container mx-auto py-8 px-4 text-center text-sm text-gray-600">
          <p>© 2026 Fintrack ERP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
