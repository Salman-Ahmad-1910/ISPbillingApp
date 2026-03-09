'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Globe, Zap, Target, Award, Heart } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  const stats = [
    { number: "500+", label: "ISPs Worldwide", description: "Trusted by ISPs across the globe" },
    { number: "50K+", label: "Active Subscribers", description: "Managed through our platform" },
    { number: "99.9%", label: "Uptime", description: "Guaranteed service availability" },
    { number: "24/7", label: "Support", description: "Round-the-clock customer service" }
  ];

  const values = [
    {
      icon: Target,
      title: "Mission-Driven",
      description: "We're committed to helping ISPs succeed with innovative technology and exceptional service."
    },
    {
      icon: Users,
      title: "Customer-Centric",
      description: "Your success is our success. We build features that solve real-world ISP challenges."
    },
    {
      icon: Globe,
      title: "Global Perspective",
      description: "Designed for ISPs worldwide with multi-currency, multi-language support."
    },
    {
      icon: Zap,
      title: "Innovation First",
      description: "Continuously evolving with cutting-edge technology and industry best practices."
    }
  ];

  const team = [
    {
      name: "Sarah Chen",
      role: "CEO & Founder",
      description: "15+ years in telecom and SaaS leadership"
    },
    {
      name: "Michael Rodriguez",
      role: "CTO",
      description: "Former Google engineer, expert in scalable systems"
    },
    {
      name: "Emily Johnson",
      role: "Head of Product",
      description: "Building ISP management solutions for 10+ years"
    },
    {
      name: "David Kim",
      role: "VP Engineering",
      description: "Leading our world-class development team"
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">About Fintrack ERP</h1>
          <p className="text-xl text-gray-600">Empowering ISPs worldwide with innovative management solutions</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Transforming ISP Management Since 2020
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Founded with a simple mission: to provide Internet Service Providers worldwide with the tools they need 
              to grow their business, streamline operations, and deliver exceptional customer service.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <Card key={index} className="border-gray-200 shadow-md text-center">
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-lg font-semibold text-gray-800 mb-1">{stat.label}</div>
                <p className="text-sm text-gray-600">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Our Story */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                Fintrack ERP was born from a simple observation: ISPs were struggling with fragmented systems that 
                didn't talk to each other. Customer data lived in spreadsheets, billing was manual, and support was chaotic.
              </p>
              <p>
                Our founders, coming from telecom and software backgrounds, knew there had to be a better way. 
                In 2020, we set out to build a comprehensive platform that would handle everything a modern ISP needs.
              </p>
              <p>
                Today, we're proud to serve over 500 ISPs worldwide, helping them manage more than 50,000 subscribers 
                through our unified platform. But we're just getting started.
              </p>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                We envision a world where every ISP, regardless of size, has access to enterprise-grade tools that 
                help them compete and thrive in the digital age.
              </p>
              <p>
                Our vision extends beyond just software. We're building a community of ISP professionals who 
                share knowledge, support each other, and collectively push the industry forward.
              </p>
              <p>
                By 2025, we aim to empower 10,000+ ISPs globally, managing over 1 million subscribers through 
                our platform while maintaining our commitment to innovation and customer success.
              </p>
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="border-gray-200 shadow-md">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center mb-4">
                    <value.icon className="h-6 w-6 text-gray-900" />
                  </div>
                  <CardTitle className="text-gray-900">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {value.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Learn More About Fintrack ERP
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Discover how we're transforming ISP management worldwide with innovative solutions.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/features" className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Explore Features
            </Link>
            <Link href="/contact" className="border border-gray-900 text-gray-900 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors">
              Contact Us
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
