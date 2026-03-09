'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Code, Database, ShieldCheck, Zap, Users, FileText } from 'lucide-react';
import Link from 'next/link';

export default function DocumentationPage() {
  const sections = [
    {
      title: "Getting Started",
      icon: BookOpen,
      description: "Quick start guides and setup instructions",
      pages: [
        "Installation and Setup",
        "First Login and Dashboard Tour",
        "Basic Configuration",
        "Adding Your First Subscriber",
        "Creating Your First Invoice"
      ]
    },
    {
      title: "API Reference",
      icon: Code,
      description: "Complete API documentation and examples",
      pages: [
        "Authentication",
        "Customers API",
        "Billing API",
        "Inventory API",
        "Reports API",
        "Webhooks"
      ]
    },
    {
      title: "Database Schema",
      icon: Database,
      description: "Database structure and relationships",
      pages: [
        "Overview",
        "Customers Table",
        "Invoices Table",
        "Subscriptions Table",
        "Users and Roles",
        "Audit Logs"
      ]
    },
    {
      title: "Security",
      icon: ShieldCheck,
      description: "Security features and best practices",
      pages: [
        "Authentication Overview",
        "Role-Based Access Control",
        "Data Encryption",
        "API Security",
        "Audit Logging"
      ]
    },
    {
      title: "Integrations",
      icon: Zap,
      description: "Connect with third-party services",
      pages: [
        "Payment Gateways",
        "SMS Providers",
        "Email Services",
        "Accounting Software",
        "Custom Webhooks"
      ]
    },
    {
      title: "User Guides",
      icon: Users,
      description: "Step-by-step guides for common tasks",
      pages: [
        "Customer Management",
        "Billing Operations",
        "Staff Management",
        "Reporting",
        "System Administration"
      ]
    }
  ];

  const quickLinks = [
    { title: "API Authentication", url: "#", category: "API" },
    { title: "Database Schema", url: "#", category: "Database" },
    { title: "Security Best Practices", url: "#", category: "Security" },
    { title: "Integration Guide", url: "#", category: "Integrations" }
  ];

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Documentation</h1>
          <p className="text-xl text-gray-600">Comprehensive guides and API documentation</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Quick Links */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Links</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {quickLinks.map((link, index) => (
              <Link
                key={index}
                href={link.url}
                className="block p-4 border border-gray-200 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-gray-900">{link.title}</span>
                </div>
                <Badge className="bg-gray-100 text-gray-800 border-gray-300 text-xs">
                  {link.category}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section, index) => (
            <Card key={index} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <section.icon className="h-8 w-8 text-gray-900" />
                  <div>
                    <CardTitle className="text-gray-900">{section.title}</CardTitle>
                    <CardDescription className="text-gray-600">{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.pages.map((page, idx) => (
                    <li key={idx}>
                      <Link href="#" className="text-gray-600 hover:text-gray-900 text-sm">
                        {page}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Code Example */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Start Example</h2>
          <div className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto">
            <pre className="text-sm">
              <code>{`// Install the Fintrack ERP CLI
npm install -g fintrackerp-cli

// Initialize your project
fintrackerp init my-isp

// Add your first subscriber
fintrackerp subscribers create \\
  --name "John Doe" \\
  --email "john@example.com" \\
  --package "Premium Plan"

// Create an invoice
fintrackerp invoices create \\
  --customer-id "123" \\
  --amount 99.99 \\
  --due-date "2024-12-31"`}</code>
            </pre>
          </div>
        </div>

        {/* API Example */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">API Example</h2>
          <div className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto">
            <pre className="text-sm">
              <code>{`// Authenticate
const response = await fetch('https://api.fintrackerp.com/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'your-password'
  })
});

const { token } = await response.json();

// Get customers
const customers = await fetch('https://api.fintrackerp.com/v1/customers', {
  headers: {
    'Authorization': \`Bearer \${token}\`
  }
});`}</code>
            </pre>
          </div>
        </div>

        {/* Resources */}
        <div className="text-center bg-white rounded-lg border border-gray-200 p-8">
          <BookOpen className="h-12 w-12 text-gray-900 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Need More Help?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Check out our API reference, video tutorials, or contact our support team for personalized assistance.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/help-center" className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Visit Help Center
            </Link>
            <Link href="/contact" className="border border-gray-900 text-gray-900 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors">
              Contact Support
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
