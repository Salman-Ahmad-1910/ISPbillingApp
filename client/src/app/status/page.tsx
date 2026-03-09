'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Clock, Zap, Wifi, Server, Activity } from 'lucide-react';
import Link from 'next/link';

export default function StatusPage() {
  const services = [
    {
      name: "API Services",
      status: "operational",
      uptime: "99.9%",
      lastCheck: "2 minutes ago",
      description: "All API endpoints are responding normally"
    },
    {
      name: "Database",
      status: "operational",
      uptime: "99.9%",
      lastCheck: "1 minute ago",
      description: "Database connections and queries working normally"
    },
    {
      name: "Authentication",
      status: "operational",
      uptime: "100%",
      lastCheck: "30 seconds ago",
      description: "Login and authentication services working normally"
    },
    {
      name: "Email Services",
      status: "operational",
      uptime: "99.8%",
      lastCheck: "5 minutes ago",
      description: "Email sending and delivery services operational"
    },
    {
      name: "Payment Processing",
      status: "operational",
      uptime: "99.9%",
      lastCheck: "3 minutes ago",
      description: "Payment gateways and processing working normally"
    },
    {
      name: "Backup Services",
      status: "operational",
      uptime: "100%",
      lastCheck: "1 hour ago",
      description: "Automated backups running successfully"
    }
  ];

  const incidents = [
    {
      title: "Scheduled Maintenance",
      date: "March 20, 2026",
      status: "resolved",
      description: "Database optimization completed successfully",
      duration: "30 minutes"
    },
    {
      title: "API Rate Limiting",
      date: "March 15, 2026",
      status: "resolved",
      description: "Increased rate limits to handle increased traffic",
      duration: "2 hours"
    },
    {
      title: "Email Service Degradation",
      date: "March 10, 2026",
      status: "resolved",
      description: "Email provider issues resolved",
      duration: "1 hour"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational": return "text-green-600";
      case "degraded": return "text-yellow-600";
      case "down": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational": return <CheckCircle className="h-5 w-5" />;
      case "degraded": return <AlertTriangle className="h-5 w-5" />;
      case "down": return <Clock className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">System Status</h1>
          <p className="text-xl text-gray-600">Real-time system performance and availability</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Overall Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Overall Status</h2>
            <Badge className="bg-green-100 text-green-800 border-green-300">
              <CheckCircle className="h-4 w-4 mr-2" />
              All Systems Operational
            </Badge>
          </div>
          <div className="text-center py-8">
            <div className="text-4xl font-bold text-green-600 mb-2">99.9%</div>
            <p className="text-gray-600">Uptime over the last 30 days</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">99.9%</div>
              <p className="text-gray-600">API Uptime</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">99.9%</div>
              <p className="text-gray-600">Database Uptime</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">100%</div>
              <p className="text-gray-600">Authentication</p>
            </div>
          </div>
        </div>

        {/* Service Status */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Service Status</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <Card key={index} className="border-gray-200 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-5 w-5 ${getStatusColor(service.status)}`}>
                        {getStatusIcon(service.status)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                        <Badge className={`${
                          service.status === 'operational' 
                            ? 'bg-green-100 text-green-800 border-green-300' 
                            : service.status === 'degraded'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                            : 'bg-red-100 text-red-800 border-red-300'
                        }`}>
                          {service.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Last check: {service.lastCheck}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-lg font-bold text-gray-900">{service.uptime}</div>
                    <p className="text-sm text-gray-600">Uptime</p>
                  </div>
                  <p className="text-gray-600">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Incidents</h2>
          <div className="space-y-4">
            {incidents.map((incident, index) => (
              <Card key={index} className="border-gray-200 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{incident.title}</h3>
                      <Badge className="bg-gray-100 text-gray-800 border-gray-300 text-sm">
                        {incident.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {incident.date} • {incident.duration}
                    </div>
                  </div>
                  <p className="text-gray-600">{incident.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance Metrics</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <Zap className="h-8 w-8 text-gray-900 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">245ms</div>
              <p className="text-gray-600">Average Response Time</p>
            </div>
            <div className="text-center">
              <Wifi className="h-8 w-8 text-gray-900 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">1.2TB</div>
              <p className="text-gray-600">Daily Data Processed</p>
            </div>
            <div className="text-center">
              <Server className="h-8 w-8 text-gray-900 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">99.9%</div>
              <p className="text-gray-600">Server Reliability</p>
            </div>
            <div className="text-center">
              <Activity className="h-8 w-8 text-gray-900 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">50K+</div>
              <p className="text-gray-600">Requests Per Minute</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center bg-white rounded-lg border border-gray-200 p-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            All Systems Operational
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            If you're experiencing any issues, please don't hesitate to contact our support team.
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
