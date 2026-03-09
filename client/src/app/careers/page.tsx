'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Zap, Award } from 'lucide-react';
import Link from 'next/link';

export default function CareersPage() {
  const openings = [
    {
      title: "Senior Frontend Developer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Build amazing user experiences for ISPs worldwide"
    },
    {
      title: "Backend Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Scale our infrastructure to serve thousands of ISPs"
    },
    {
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "Remote",
      type: "Full-time",
      description: "Help ISPs get the most value from our platform"
    },
    {
      title: "Product Manager",
      department: "Product",
      location: "Remote",
      type: "Full-time",
      description: "Shape the future of ISP management software"
    }
  ];

  const benefits = [
    "Competitive salary and equity",
    "Comprehensive health benefits",
    "Flexible work arrangements",
    "Professional development budget",
    "Unlimited PTO",
    "Home office stipend",
    "Team building events"
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Careers</h1>
          <p className="text-xl text-gray-600">Join us in transforming ISP management worldwide</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Build the Future of ISP Management
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're a team of passionate individuals working to empower ISPs worldwide. 
            Join us and make a real impact in the telecommunications industry.
          </p>
        </div>

        {/* Open Positions */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Open Positions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {openings.map((job, index) => (
              <Card key={index} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-gray-900 mb-2">{job.title}</CardTitle>
                      <CardDescription className="text-gray-600">{job.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                      {job.department}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                      {job.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{job.location}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link 
                    href="#" 
                    className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg font-medium transition-colors inline-block"
                  >
                    Apply Now
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Why Work With Us</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-gray-200 shadow-md text-center">
              <CardContent className="p-6">
                <Users className="h-12 w-12 text-gray-900 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Amazing Team</h3>
                <p className="text-gray-600 text-sm">Work with talented, passionate people from around the world</p>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-md text-center">
              <CardContent className="p-6">
                <Zap className="h-12 w-12 text-gray-900 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Impactful Work</h3>
                <p className="text-gray-600 text-sm">Help thousands of ISPs succeed and grow their businesses</p>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-md text-center">
              <CardContent className="p-6">
                <Award className="h-12 w-12 text-gray-900 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Growth Opportunities</h3>
                <p className="text-gray-600 text-sm">Learn, grow, and advance your career with us</p>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-md text-center">
              <CardContent className="p-6">
                <div className="h-12 w-12 text-gray-900 mx-auto mb-4 flex items-center justify-center">
                  🏠
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Remote First</h3>
                <p className="text-gray-600 text-sm">Work from anywhere with flexible arrangements</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Benefits List */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Benefits & Perks</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-900 rounded-full" />
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Culture */}
        <div className="text-center bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Culture</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6">
            We believe in transparency, collaboration, and continuous learning. 
            We value diverse perspectives and foster an inclusive environment where everyone can do their best work.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/about" className="border border-gray-900 text-gray-900 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors">
              Learn More About Us
            </Link>
            <Link href="/contact" className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Get in Touch
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
