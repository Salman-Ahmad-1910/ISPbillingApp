'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function BlogPage() {
  const posts = [
    {
      title: "5 Ways to Reduce Customer Churn in Your ISP Business",
      excerpt: "Learn proven strategies to keep your customers happy and reduce churn rates.",
      date: "March 15, 2026",
      author: "Sarah Chen",
      category: "Customer Success",
      readTime: "5 min read"
    },
    {
      title: "The Future of ISP Management: AI and Automation",
      excerpt: "How artificial intelligence is transforming ISP operations and customer service.",
      date: "March 10, 2026",
      author: "Michael Rodriguez",
      category: "Technology",
      readTime: "8 min read"
    },
    {
      title: "Billing Best Practices for Growing ISPs",
      excerpt: "Optimize your billing processes to improve cash flow and customer satisfaction.",
      date: "March 5, 2026",
      author: "Emily Johnson",
      category: "Operations",
      readTime: "6 min read"
    },
    {
      title: "Customer Support Excellence: Lessons from Top ISPs",
      excerpt: "What the most successful ISPs do differently when it comes to customer support.",
      date: "February 28, 2026",
      author: "David Kim",
      category: "Support",
      readTime: "7 min read"
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Blog</h1>
          <p className="text-xl text-gray-600">Insights and best practices for ISP success</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post, index) => (
            <Card key={index} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                    {post.category}
                  </Badge>
                  <span className="text-sm text-gray-500">{post.readTime}</span>
                </div>
                <CardTitle className="text-gray-900 mb-2">{post.title}</CardTitle>
                <CardDescription className="text-gray-600">{post.excerpt}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{post.author}</span>
                  <span>{post.date}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-16 text-center bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Stay Updated</h2>
          <p className="text-gray-600 mb-6">
            Get the latest ISP management tips and insights delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
            />
            <button className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Subscribe
            </button>
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
