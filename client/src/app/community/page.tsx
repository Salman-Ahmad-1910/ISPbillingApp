'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, ThumbsUp, Calendar, Star, Award } from 'lucide-react';
import Link from 'next/link';

export default function CommunityPage() {
  const discussions = [
    {
      title: "Best practices for customer retention?",
      author: "Sarah Chen",
      category: "Customer Success",
      replies: 23,
      views: "1.2k",
      lastActivity: "2 hours ago",
      preview: "Looking for proven strategies to keep our customers happy and reduce churn..."
    },
    {
      title: "How do you handle late payments?",
      author: "Michael Rodriguez",
      category: "Billing",
      replies: 15,
      views: "892",
      lastActivity: "5 hours ago",
      preview: "We're struggling with late payments. What strategies work best for ISPs?"
    },
    {
      title: "Recommended equipment for 500+ subscribers?",
      author: "Emily Johnson",
      category: "Network Infrastructure",
      replies: 31,
      views: "2.1k",
      lastActivity: "1 day ago",
      preview: "We're expanding to 500+ subscribers. What equipment should we invest in?"
    },
    {
      title: "Customer support workflow ideas",
      author: "David Kim",
      category: "Support",
      replies: 18,
      views: "1.5k",
      lastActivity: "3 days ago",
      preview: "Looking to improve our customer support process. What workflows work well?"
    }
  ];

  const events = [
    {
      title: "ISP Management Best Practices Webinar",
      date: "March 25, 2026",
      time: "2:00 PM EST",
      description: "Learn industry best practices for managing ISP operations efficiently",
      type: "Webinar"
    },
    {
      title: "Product Roadmap Q&A",
      date: "April 1, 2026",
      time: "3:00 PM EST",
      description: "Join our product team for a live Q&A about upcoming features",
      type: "Q&A"
    },
    {
      title: "Customer Success Stories",
      date: "April 8, 2026",
      time: "1:00 PM EST",
      description: "Hear from successful ISPs using Fintrack ERP",
      type: "Panel"
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Community</h1>
          <p className="text-xl text-gray-600">Connect with ISPs worldwide and share knowledge</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="border-gray-200 shadow-md text-center">
            <CardContent className="p-6">
              <Users className="h-8 w-8 text-gray-900 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">5,000+</div>
              <div className="text-gray-600">Community Members</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-md text-center">
            <CardContent className="p-6">
              <MessageSquare className="h-8 w-8 text-gray-900 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">1,200+</div>
              <div className="text-gray-600">Discussions</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-md text-center">
            <CardContent className="p-6">
              <ThumbsUp className="h-8 w-8 text-gray-900 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">15,000+</div>
              <div className="text-gray-600">Solutions Shared</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-md text-center">
            <CardContent className="p-6">
              <Award className="h-8 w-8 text-gray-900 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">98%</div>
              <div className="text-gray-600">Satisfaction Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Join Community */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center mb-12">
          <Users className="h-16 w-16 text-gray-900 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Join Our Thriving Community
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6">
            Connect with thousands of ISP professionals, share experiences, and learn from industry experts.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/signup" className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Join Now
            </Link>
            <Link href="/login" className="border border-gray-900 text-gray-900 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors">
              Sign In
            </Link>
          </div>
        </div>

        {/* Recent Discussions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Discussions</h2>
          <div className="space-y-4">
            {discussions.map((discussion, index) => (
              <Card key={index} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                          {discussion.category}
                        </Badge>
                        <h3 className="font-semibold text-gray-900 hover:text-gray-700 cursor-pointer">
                          {discussion.title}
                        </h3>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{discussion.preview}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{discussion.author}</span>
                        <span>•</span>
                        <span>{discussion.replies} replies</span>
                        <span>•</span>
                        <span>{discussion.views} views</span>
                        <span>•</span>
                        <span>{discussion.lastActivity}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center">
            <Link href="#" className="text-gray-900 hover:underline font-medium">
              View All Discussions →
            </Link>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Events</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {events.map((event, index) => (
              <Card key={index} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-gray-900" />
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                      {event.type}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{event.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{event.date}</span>
                    <span>•</span>
                    <span>{event.time}</span>
                  </div>
                  <Link href="#" className="text-gray-900 hover:underline font-medium">
                    Register →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Featured Contributors */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Top Contributors</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-600">SC</span>
              </div>
              <h3 className="font-semibold text-gray-900">Sarah Chen</h3>
              <p className="text-sm text-gray-600">324 solutions</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
              </div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-600">MR</span>
              </div>
              <h3 className="font-semibold text-gray-900">Michael Rodriguez</h3>
              <p className="text-sm text-gray-600">256 solutions</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
              </div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-600">EJ</span>
              </div>
              <h3 className="font-semibold text-gray-900">Emily Johnson</h3>
              <p className="text-sm text-gray-600">198 solutions</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
              </div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-600">DK</span>
              </div>
              <h3 className="font-semibold text-gray-900">David Kim</h3>
              <p className="text-sm text-gray-600">167 solutions</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
              </div>
            </div>
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
