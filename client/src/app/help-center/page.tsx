'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, Video, MessageSquare, Download, Users } from 'lucide-react';
import Link from 'next/link';

export default function HelpCenterPage() {
  const categories = [
    {
      title: "Getting Started",
      icon: BookOpen,
      articles: [
        "Setting up your account",
        "Adding your first subscriber",
        "Creating invoices",
        "Managing staff accounts",
        "Setting up billing"
      ]
    },
    {
      title: "Billing & Payments",
      icon: Download,
      articles: [
        "Creating and sending invoices",
        "Payment methods setup",
        "Managing subscriptions",
        "Financial reports",
        "Expense tracking"
      ]
    },
    {
      title: "Customer Management",
      icon: Users,
      articles: [
        "Adding new customers",
        "Managing guarantors",
        "Communication history",
        "Customer segmentation",
        "Bulk operations"
      ]
    },
    {
      title: "Support & Troubleshooting",
      icon: MessageSquare,
      articles: [
        "Common issues and solutions",
        "System requirements",
        "Data backup and restore",
        "Performance optimization",
        "Security best practices"
      ]
    }
  ];

  const popularArticles = [
    {
      title: "Complete Setup Guide for New ISPs",
      category: "Getting Started",
      views: "15.2k",
      helpful: "89%"
    },
    {
      title: "How to Migrate Your Existing Data",
      category: "Getting Started",
      views: "8.7k",
      helpful: "92%"
    },
    {
      title: "Understanding Your Billing Dashboard",
      category: "Billing & Payments",
      views: "6.3k",
      helpful: "85%"
    },
    {
      title: "Customer Support Best Practices",
      category: "Customer Management",
      views: "4.1k",
      helpful: "87%"
    }
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Help Center</h1>
          <p className="text-xl text-gray-600">Find answers and get the most out of Fintrack ERP</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help articles..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-gray-900"
            />
          </div>
        </div>

        {/* Popular Articles */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Articles</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {popularArticles.map((article, index) => (
              <Card key={index} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                      {article.category}
                    </Badge>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{article.views} views</span>
                      <span>•</span>
                      <span>{article.helpful} helpful</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{article.title}</h3>
                  <Link href="#" className="text-gray-600 hover:text-gray-900 text-sm">
                    Read article →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <Card key={index} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <category.icon className="h-8 w-8 text-gray-900" />
                    <CardTitle className="text-gray-900">{category.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {category.articles.map((article, idx) => (
                      <li key={idx}>
                        <Link href="#" className="text-gray-600 hover:text-gray-900 text-sm">
                          {article}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Video Tutorials */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Video Tutorials</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-gray-200 shadow-md">
              <CardContent className="p-6">
                <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                  <Video className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Quick Start Guide</h3>
                <p className="text-gray-600 text-sm mb-4">Get up and running in under 10 minutes</p>
                <Link href="#" className="text-gray-900 hover:underline text-sm">
                  Watch Video →
                </Link>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-md">
              <CardContent className="p-6">
                <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                  <Video className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Advanced Features</h3>
                <p className="text-gray-600 text-sm mb-4">Learn about powerful features</p>
                <Link href="#" className="text-gray-900 hover:underline text-sm">
                  Watch Video →
                </Link>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-md">
              <CardContent className="p-6">
                <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                  <Video className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Tips & Tricks</h3>
                <p className="text-gray-600 text-sm mb-4">Power user techniques</p>
                <Link href="#" className="text-gray-900 hover:underline text-sm">
                  Watch Video →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <MessageSquare className="h-12 w-12 text-gray-900 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Can't Find What You're Looking For?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our support team is here to help. Get in touch and we'll assist you with any questions.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/contact" className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Contact Support
            </Link>
            <Link href="mailto:support@fintrackerp.com" className="border border-gray-900 text-gray-900 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors">
              Email Us
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
