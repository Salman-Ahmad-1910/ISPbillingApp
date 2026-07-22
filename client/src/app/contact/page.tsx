'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, MessageSquare, Users } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email",
      value: "support@fintrackerp.com",
      action: "support@fintrackerp.com"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Call us for immediate assistance",
      value: "+1 (555) 123-4567",
      action: "+1 (555) 123-4567"
    },
    {
      icon: MapPin,
      title: "Office Location",
      description: "Visit our headquarters",
      value: "123 Tech Street, Silicon Valley, CA 94025",
      action: "Get Directions"
    }
  ];

  const departments = [
    { name: "Sales", email: "sales@fintrackerp.com", description: "Questions about pricing and features" },
    { name: "Support", email: "support@fintrackerp.com", description: "Technical help and account issues" },
    { name: "Partnerships", email: "partners@fintrackerp.com", description: "Business and integration opportunities" },
    { name: "Press", email: "press@fintrackerp.com", description: "Media inquiries and press releases" }
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contact Us</h1>
          <p className="text-xl text-gray-600">We're here to help you succeed</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Contact Methods */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {contactMethods.map((method, index) => (
            <Card key={index} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <method.icon className="h-12 w-12 text-gray-900 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">{method.title}</h3>
                <p className="text-gray-600 mb-4">{method.description}</p>
                <div className="text-gray-900 font-medium">{method.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Form */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
            <Card className="border-gray-200 shadow-md">
              <CardContent className="p-6">
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <Input 
                      placeholder="Your name" 
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <Input 
                      type="email" 
                      placeholder="your.email@example.com" 
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <Input 
                      placeholder="How can we help?" 
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea 
                      rows={4} 
                      placeholder="Tell us more about your inquiry..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                  <Button className="w-full bg-gray-900 hover:bg-black text-white">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Departments</h2>
            <div className="space-y-4">
              {departments.map((dept, index) => (
                <Card key={index} className="border-gray-200 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{dept.description}</p>
                        <div className="text-gray-900">{dept.email}</div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-gray-900 text-gray-900 hover:bg-gray-50"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How quickly can I get started?</h3>
              <p className="text-gray-600">You can sign up and start using Fintrack ERP immediately. We offer a 14-day free trial with no credit card required.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Do you offer training?</h3>
              <p className="text-gray-600">Yes! We provide comprehensive onboarding, training materials, and ongoing support to help you get the most out of our platform.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I customize the platform?</h3>
              <p className="text-gray-600">Our Enterprise plans include customizations, white-labeling, and tailored solutions to meet your specific needs.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What kind of support do you provide?</h3>
              <p className="text-gray-600">We offer 24/7 email support, phone support for Professional and Enterprise plans, and a comprehensive knowledge base.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white rounded-lg border border-gray-200 p-8">
          <MessageSquare className="h-12 w-12 text-gray-900 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Still Have Questions?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our team is ready to help you find the perfect solution for your ISP business.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/signup" className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Start Free Trial
            </Link>
            <Link href="tel:+15551234567" className="border border-gray-900 text-gray-900 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors">
              Call Us
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
