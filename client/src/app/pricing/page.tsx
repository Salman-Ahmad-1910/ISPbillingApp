'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star, Users, Zap, ShieldCheck, HeadphonesIcon } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Perfect for small ISPs getting started",
      features: [
        "Up to 100 subscribers",
        "Basic CRM features",
        "Simple billing system",
        "Email support",
        "Basic reporting",
        "Mobile app access"
      ],
      popular: false,
      cta: "Start Free Trial"
    },
    {
      name: "Professional",
      price: "$99",
      period: "/month",
      description: "Ideal for growing ISPs with expanding needs",
      features: [
        "Up to 1,000 subscribers",
        "Advanced CRM & billing",
        "Inventory management",
        "Priority support",
        "Advanced analytics",
        "API access",
        "Custom branding",
        "Multi-location support"
      ],
      popular: true,
      cta: "Start Free Trial"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For large ISPs with complex requirements",
      features: [
        "Unlimited subscribers",
        "All features included",
        "Dedicated account manager",
        "24/7 phone support",
        "Custom integrations",
        "White-label options",
        "On-premise deployment",
        "SLA guarantee",
        "Custom training"
      ],
      popular: false,
      cta: "Contact Sales"
    }
  ];

  const testimonials = [
    {
      name: "TechNet Solutions",
      role: "CEO",
      content: "Fintrack ERP transformed how we manage our 500+ subscribers. The automation alone saved us 20 hours per week.",
      rating: 5
    },
    {
      name: "GlobalConnect ISP",
      role: "Operations Manager",
      content: "The billing and CRM features are exactly what we needed. Customer satisfaction increased by 40%.",
      rating: 5
    },
    {
      name: "CityBroadband",
      role: "Founder",
      content: "From startup to 1000+ subscribers, Fintrack scaled with us every step of the way.",
      rating: 5
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Pricing</h1>
          <p className="text-xl text-gray-600">Transparent pricing for businesses of all sizes</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Pricing Plans */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <Card key={index} className={`border-gray-200 ${plan.popular ? 'ring-2 ring-gray-900 shadow-xl' : 'shadow-lg'} relative`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gray-900 text-white">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600">{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${plan.popular ? 'bg-gray-900 hover:bg-black' : 'border border-gray-900 text-gray-900 hover:bg-gray-50'} text-white`}
                  asChild
                >
                  <Link href={plan.cta === "Contact Sales" ? "/contact" : "/signup"}>
                    {plan.cta}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">What Our Customers Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-gray-200 shadow-md">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Can I change my plan later?</h3>
                <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.</p>
              </CardContent>
            </Card>
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h3>
                <p className="text-gray-600">Yes! All plans come with a 14-day free trial. No credit card required to start.</p>
              </CardContent>
            </Card>
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-600">We accept all major credit cards, PayPal, and bank transfers for annual plans.</p>
              </CardContent>
            </Card>
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Do you offer discounts for annual billing?</h3>
                <p className="text-gray-600">Yes! Annual billing saves you 20% compared to monthly billing.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Start Your Free Trial Today
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of ISPs worldwide. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/signup" className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-lg font-medium transition-colors">
              Start Free Trial
            </Link>
            <Link href="/contact" className="border border-gray-900 text-gray-900 hover:bg-gray-50 px-8 py-3 rounded-lg font-medium transition-colors">
              Talk to Sales
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
