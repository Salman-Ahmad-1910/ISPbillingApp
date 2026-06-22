'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Lock, Key, Eye, Database, Cloud, Users, Zap, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function SecurityPage() {
  const securityFeatures = [
    {
      icon: ShieldCheck,
      title: "Enterprise-Grade Security",
      description: "Bank-level encryption and security protocols to protect your sensitive business data."
    },
    {
      icon: Lock,
      title: "Data Encryption",
      description: "All data encrypted at rest and in transit using industry-standard AES-256 encryption."
    },
    {
      icon: Key,
      title: "Role-Based Access Control",
      description: "Granular permissions ensure employees only access the data they need for their job."
    },
    {
      icon: Database,
      title: "Secure Database",
      description: "Regular backups, disaster recovery, and secure database hosting with 99.9% uptime."
    },
    {
      icon: Cloud,
      title: "Cloud Infrastructure",
      description: "Enterprise cloud hosting with automatic security updates and monitoring."
    },
    {
      icon: Users,
      title: "Multi-Factor Authentication",
      description: "Optional 2FA support for additional security on sensitive accounts."
    },
    {
      icon: Eye,
      title: "Audit Logging",
      description: "Complete audit trails for all actions, ensuring compliance and accountability."
    },
    {
      icon: Zap,
      title: "Real-time Monitoring",
      description: "24/7 security monitoring with instant threat detection and response."
    }
  ];

  const compliance = [
    "SOC 2 Type II Certified",
    "GDPR Compliant",
    "ISO 27001 Aligned",
    "PCI DSS Compliant"
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Security</h1>
          <p className="text-xl text-gray-600">Enterprise-grade security to protect your business data</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full mb-6">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-semibold">Trusted by 500+ ISPs Worldwide</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Your Data Security is Our Priority
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We implement industry-leading security measures to ensure your ISP business data remains protected, 
            compliant, and available 24/7.
          </p>
        </div>

        {/* Security Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {securityFeatures.map((feature, index) => (
            <Card key={index} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-gray-900" />
                </div>
                <CardTitle className="text-gray-900">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Compliance Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Compliance & Certifications</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {compliance.map((cert, index) => (
              <div key={index} className="text-center">
                <Badge className="bg-gray-100 text-gray-800 border-gray-300 px-4 py-2">
                  {cert}
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-600 mt-6">
            We maintain strict compliance with international data protection regulations and industry standards.
          </p>
        </div>

        {/* Security Stats */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-gray-200 shadow-md text-center">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-gray-900 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime SLA</div>
              <p className="text-sm text-gray-500 mt-2">Guaranteed availability</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-md text-center">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
              <div className="text-gray-600">Monitoring</div>
              <p className="text-sm text-gray-500 mt-2">Real-time threat detection</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-md text-center">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-gray-900 mb-2">256-bit</div>
              <div className="text-gray-600">Encryption</div>
              <p className="text-sm text-gray-500 mt-2">AES encryption standard</p>
            </CardContent>
          </Card>
        </div>

        {/* Best Practices */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Security Best Practices</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-gray-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  For Your Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                    <span>Use strong, unique passwords</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                    <span>Enable two-factor authentication</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                    <span>Regular security training</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                    <span>Report suspicious activities</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Our Commitment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                    <span>Regular security audits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                    <span>Penetration testing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                    <span>Security incident response</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                    <span>Continuous monitoring</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Security Concerns?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            If you have any security questions or need to report a security issue, our team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/contact" className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Contact Security Team
            </Link>
            <Link href="mailto:security@fintrackerp.com" className="border border-gray-900 text-gray-900 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors">
              security@fintrackerp.com
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
